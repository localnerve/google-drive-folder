/**
 * Get the markdown from Google Drive, mark it up, and store locallly.
 *
 * Copyright (c) 2021 Alex Grant (@localnerve), LocalNerve LLC
 * Private use for LocalNerve, LLC only. Unlicensed for any other use.
 */
import { google } from 'googleapis';
import remark from 'remark';
import remarkHtml from 'remark-html';
import path from 'path';

import util from 'util';

const DEFAULT_NAME = 'BAD_NAME_PARSE';
const DEFAULT_EXT = 'BAD_EXT_PARSE';

/**
 * Download a file from google drive.
 * 
 * Called in quick succession, there are problems with rate limits appearing as 403.
 * In the second argument to export, the options is an extention of GaxiosOptions,
 * so this is possible (I found it was unhelpful and ultimately unneeded).
 * No amount of trickery can exceed the limit of the service.
 *//* 
    {
      retry: true,
      retryConfig: {
        retryDelay: 1000,
        onRetryAttempt: err => {
          console.log('@@@ retry attempt', err);
          return Promise.resolve();
        },
        shouldRetry: () => true,
        statusCodesToRetry: [[100, 199], [403, 403], [429, 429], [500, 599]]
      },
      responseType: 'stream'
    }
 *//*
 * @param {Google.Drive} drive - Google Drive.
 * @param {Google.FileResource} file - A Google File Resource object.
 * @returns {Promise} Resolves to an Object { name, ext, data }.
 */
export function downloadFile(drive, file) {
  return new Promise((resolve, reject) => {
    const buffers = [];
    drive.files.export({
      fileId: file.id,
      mimeType: 'text/plain'
    }, {
      responseType: 'stream'
    }).then(res => {
      res.data
        .on('data', chunk => {
          buffers.push(chunk);
        })
        .on('end', () => {
          const pf = path.parse(String(file.name));
          resolve({
            name: pf.name || DEFAULT_NAME,
            ext: pf.ext || DEFAULT_EXT,
            data: Buffer.concat(buffers).toString('utf8')
          });
        })
        .on('error', err => {
          console.error(`Error during ${file.name} download`, err); // eslint-disable-line
          reject(err);
        });
      return res;
    }).catch(err => {
      reject(err);
    });
  });
}

/**
 * Convert raw data to content based on extension.
 *
 * @param {Object} input - The source data.
 * @param {String} input.data - The source content.
 * @param {String} input.name - The source file name.
 * @param {String} input.ext - The source file extension.
 * @returns {Promise} Resolves to an Object { input, output, converted }.
 */
export function convert(input) {
  return new Promise((resolve, reject) => {
    if (input.ext === '.md') {
      remark()
        .use(remarkHtml)
        .process(input.data, (err, res) => {
          if (err) {
            console.error(`failed to convert ${input.name}`, err); // eslint-disable-line
            return reject(err);
          }
          return resolve({
            input,
            output: {
              name: input.name,
              ext: '.html',
              data: String(res)
            },
            converted: true
          });
        });
    } else if (input.ext === '.json') {
      let inputData = input.data;
      // Catches EFBBBF (UTF-8 BOM) because the buffer-to-string
      // conversion translates it to FEFF (UTF-16 BOM)
      if (inputData.charCodeAt(0) === 0xFEFF) {
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
        output: {},
        converted: false
      });
    }
    return;
  });
}

/**
 * Get files from Google Drive, convert to html, json or passthru, and return them.
 * This function relies on env SVC_ACCT_CREDENTIALS with the path to the service account credential file.
 * Relies on a service account that can impersonate the owner of the content files.
 * 
 * @param {String} folderId - Google Drive folder Id that holds the content files.
 * @param {String} userId - The email address of the account that owns the google drive folder.
 * @param {Array} [scopes] - An array of scopes authorized to get from google drive, defaults to drive.readonly.
 * @param {String} process.env.SVC_ACCT_CREDENTIALS - Path to service account cert that can impersonate the content owner.
 * @returns {Promise} array of data objects { input, output, converted }
 */
export async function extractTransform(
  folderId, userId, scopes = [
    'https://www.googleapis.com/auth/drive.readonly'
  ]
) {
  const svc_acct_credentials = process.env.SVC_ACCT_CREDENTIALS;

  const auth = new google.auth.GoogleAuth({
    clientOptions: {
      subject: userId, // The user to impersonate
      forceRefreshOnFailure: true // keep the token updated
      // eagerRefreshThresholdMillis: 900000 // 15 * 60 * 1000
    },
    keyFile: svc_acct_credentials,
    // scopes *apparently* need to match the service account delegation as defined exactly.
    scopes
  });

  // Google drive api as service account impersonating the drive user
  const googDrive = google.drive({
    version: 'v3',
    auth
  });

  // Get the file list in the content folder
  let listRes;

  try {
    listRes = await googDrive.files.list({
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
      q: `'${folderId}' in parents`,
      fields: 'files(id, name)',
      spaces: 'drive'
    });
  } catch (e) {
    console.error(`failed getting file list for user ${userId}, and folder ${folderId}`);
    console.error(e);
    throw e;
  }

  /*
  async function* generateSequence(items, task) { 
    let result;
    for(let i = 0; i < items.length; i++)
      result = await task(items[i]);
      yield result;
    }
  }
  */

  // Download the files from the content folder in series to avoid 403 limits
  const dataArray = [];
  const files = [];
  Array.prototype.push.apply(files, listRes.data.files);
  try {
    /*
    const generator = generateSequence(files, downloadFile.bind(null, googDrive));
    for await (let data of generator) {
      dataArray.push(data);
    }
    */
    let data;
    for (let i = 0; i < files.length; i++) {
      data = await downloadFile(googDrive, files[i]);
      dataArray.push(data);
    }
  } catch (e) {
    console.error('failed downloading files');
    console.error(util.inspect(e, { depth: 6 }));
    throw e;
  }

  return Promise.all(dataArray.map(data => convert(data)));
}

export default extractTransform;
