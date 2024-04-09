import googleDriveFolder from 'package';
import fs from 'node:fs/promises';
import path from 'node:path';
import util from 'node:util';
import { micromark } from 'micromark';
import { directive, directiveHtml } from 'micromark-extension-directive';

/**
 * Setup the private prerequisites for the environment.
 * If this is not available in the test environment, just skip.
 * 
 * @returns {Object} containing the folderId and userId for the google drive.
 */
async function setupPrivateEnv () {
  const svc_acct_path = path.resolve('../../localnerve-com/private/stage-localnerve-com-3bcd66ab3f20.json');
  const env_file_path = path.resolve('../../localnerve-com/private/stage-env-func.json');

  let exists = false;
  try {
    await fs.access(env_file_path);
    await fs.access(svc_acct_path);
    exists = true;
  } catch {}

  if (exists) {
    const funcEnvJson = await fs.readFile(env_file_path);
    const funcEnv = JSON.parse(funcEnvJson);

    const folderId = funcEnv.content.folder;
    const userId = funcEnv.content.user;

    process.env.SVC_ACCT_CREDENTIALS = svc_acct_path;
    return {
      folderId,
      userId
    };
  }

  return {
    folderId: 'SKIP',
    userId: 'SKIP'
  };
}

/**
 * Micromark custom 'json' container directive handler.
 *
 * @param {Micromark.Directive} d - The micromark directive structure.
 */
function jsonDirective (d) {
  if (!(d.type === 'containerDirective' && d.name === 'json')) return false;

  this.raw(d.content.replace(/&quot;/g, '"'));
}

/**
 * Convert raw data to content based on extension.
 * This function only knows about .md and .json.
 * Everything else is passed through, kept in { input }, converted is false.
 *
 * @param {Object} input - The source data.
 * @param {String} input.data - The source content.
 * @param {String} input.name - The source file name.
 * @param {String} input.ext - The source file extension.
 * @returns {Promise} Resolves to an Object { input, output, converted }.
 */
function transformer (input) {
  return new Promise(resolve => {
    if (input.ext === '.md') {
      const res = micromark(input.data, {
        allowDangerousHtml: true,
        allowDangerousProtocol: true,
        extensions: [directive()],
        htmlExtensions: [directiveHtml({json: jsonDirective})]
      });
      resolve({
        input,
        output: {
          name: input.name,
          ext: '.html',
          data: String(res)
        },
        converted: true
      });
    } else if (input.ext === '.json') {
      let inputData = input.data;
      // Catches EFBBBF (UTF-8 BOM) because the buffer-to-string
      // conversion translates it to FEFF (UTF-16 BOM)
      if (inputData.charCodeAt(0) === 0xfeff) {
        inputData = inputData.slice(1);
      }
      resolve({
        input,
        output: {
          name: input.name,
          ext: '.json',
          data: JSON.stringify(JSON.parse(inputData))
        },
        converted: true
      });
    } else {
      resolve({
        input,
        output: input,
        converted: false
      });
    }
  });
}

(async function () {
  try {
    const { folderId, userId } = await setupPrivateEnv();
    if (userId === 'SKIP') {
      console.log('Private environment unavailable, skipping...');
    } else {
      const outputDirectory = path.resolve('./tmp/test-output');
      await fs.mkdir(outputDirectory, { recursive: true });
      const stream = await googleDriveFolder(folderId, userId, {
        outputDirectory,
        exportMimeMap: {
          'application/vnd.google-apps.document': 'text/plain'
        },
        transformer
      });
      stream.on('data', data => {
        console.log('data: ', `${util.inspect(data, {
          maxStringLength: 10
        })}...`);
      });
      stream.on('end', () => {
        console.log('stream ended');
      });
      stream.on('error', e => {
        console.error('stream error', e);
      });
    }
  } catch (e) {
    console.error(e);
  }
}());
