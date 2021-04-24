/**
 * Get files from Google Drive, convert if recognized.
 *
 * Copyright (c) 2021 Alex Grant (@localnerve), LocalNerve LLC
 * Private use for LocalNerve, LLC only. Unlicensed for any other use.
 */
import { google } from 'googleapis';
import path from 'path';
import util from 'util';

import { createObjectStream, writeToDirectory } from './load';

const DEFAULT_NAME = '';
const DEFAULT_EXT = '';

/**
 * Update the error with additional helpful context messages.
 *
 * @param {Error} error - The error to handle
 * @param  {Array<String>} messages - Additional messages to add.
 * @returns {Error} the updated Error
 */
function handleError(error, ...messages) {
  if (messages.length > 0) {
    messages.push(error.message);
    error.message = messages.join('\n');
  }
  return error;
}

/**
 * Download a file from google drive.
 * 
 * Called in quick succession, there are problems with rate limits appearing as 403.
 * In the second argument to export, the options is an extention of GaxiosOptions,
 * so this is possible (I found it was unhelpful and ultimately unneeded).
 * No amount of trickery can exceed the limit of the service.
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
 *
 * @param {Google.Drive} drive - Google Drive.
 * @param {Google.FileResource} file - A Google File Resource object.
 * @param {String} file.name - The file name.
 * @param {String} file.id - The file id.
 * @param {String} file.mimeType - The file mimeType
 * @param {String} file.fullFileExtension - The final file extension (binary only)
 * @param {Object} [exportMimeMap] - Selects export method and format
 * @returns {Promise} Resolves to an Object { name, ext, data }.
 */
export async function downloadFile(drive, file, exportMimeMap) {
  const errMsg = `Error downloading \
'${file.name}', id: '${file.id}', mimeType: '${file.mimeType}' \
'${file.fullFileExtension}'`;

  let method = 'get';
  const parameters = {
    fileId: file.id
  };

  if (exportMimeMap) {
    method = 'export';
    parameters.mimeType = exportMimeMap[file.mimeType] || file.mimeType;
  } else {
    parameters.alt = 'media';
  }

  return new Promise((resolve, reject) => {
    const buffers = [];
    drive.files[method](parameters, {
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
            ext: file.fullFileExtension || pf.ext || DEFAULT_EXT,
            data: file.fullFileExtension ? Buffer.concat(buffers)
              : Buffer.concat(buffers).toString('utf8'),
            binary: !!file.fullFileExtension,
            downloadMeta: {
              method,
              parameters
            }
          });
        })
        .on('error', err => {
          reject(handleError(err, errMsg));
        });
    }).catch(err => {
      reject(handleError(err, errMsg));
    });
  });
}

/**
 * startObjectFlow
 *
 * Starts and drives the object flow for the library.
 * Downloads the files and writes to the stream for conversion.
 *
 * @param {Google.Drive} googDrive - The google drive instance to download from.
 * @param {Array<Object>} files - The array of files from the folder.
 * @param {ObjectTransformStream} objectStream - The object stream to write to.
 * @param {Object} exportMimeMap - The mime map to use in 'export'
 */
export async function startObjectFlow(googDrive, files, objectStream, exportMimeMap) {
  let i = 0;
  try {
    let data;
    for (; i < files.length; i++) {
      data = await downloadFile(googDrive, files[i], exportMimeMap);
      objectStream.write(data);
    }
  } catch (e) {
    throw handleError(
      e,
      `Failed downloading files at file '${files[i].name}'`,
      util.inspect(e, { depth: 6 })
    );
  } finally {
    objectStream.end();
  }
}

/**
 * Get files from Google Drive, convert to html, json or passthru, and return them.
 * This function relies on env SVC_ACCT_CREDENTIALS with the path to the service account credential file.
 * Relies on a service account that can impersonate the owner of the content files.
 * 
 *  Example Workspace File exportMimeMap:
 *    'application/vnd.google-apps.document': 'text/plain',
 *    'application/vnd.google-apps.presentation': 'text/plain',
 *    'application/vnd.google-apps.spreadsheet': 'application/pdf',
 *    'application/vnd.google-apps.drawing': 'image/svg+xml',
 *    'application/vnd.google-apps.script': 'application/vnd.google-apps.script+json'
 *
 * @env SVC_ACCT_CREDENTIALS - Path to service account cert that can impersonate the content owner. 
 * @param {String} folderId - The folderId of the drive to read from.
 * @param {String} userId - The userId of the owner of the drive.
 * @param {Object} [options] - Additional options.
 * @param {String} [options.fileQuery] - A Google drive search query for file selection.
 *   @see https://developers.google.com/drive/api/v3/ref-search-terms
 * @param {Array}  [options.scopes] - The scopes required by the account owner, defaults to `drive.readonly`.
 * @param {GoogleAuth|OAuth2Client|JWT|String} [options.auth] - An alternate, pre-resolved auth.
 * @param {String} [options.outputDirectory] - The path to the output folder. If defined, writes to directory during object stream.
 * @param {Object} [options.exportMimeMap] - The mime-type conversion map to use in 'export', implies export.
 * @param {Function} [options.transformer] - The conversion transformer function.
 * @returns {Promise} array of data objects { input, output, converted }
 */
export async function extractTransform(folderId, userId, {
  fileQuery = '',
  scopes = [
    'https://www.googleapis.com/auth/drive.readonly'
  ],
  auth = null,
  outputDirectory = '',
  exportMimeMap = null,
  transformer = input => Promise.resolve({
    input,
    output: input,
    converted: false
  })
} = {}) {
  let keyFile = '';

  if (!auth) {
    keyFile = process.env.SVC_ACCT_CREDENTIALS;
    auth = new google.auth.GoogleAuth({
      clientOptions: {
        subject: userId, // The user to impersonate
        forceRefreshOnFailure: true // keep the token updated
        // eagerRefreshThresholdMillis: 900000 // 15 * 60 * 1000
      },
      keyFile,
      // scopes *apparently* need to match the service account delegation as defined exactly.
      scopes
    });
  }

  // Google drive api as service account impersonating the drive user
  const googDrive = google.drive({
    version: 'v3',
    auth
  });

  // Get the file list from the folder
  let listRes;
  try {
    listRes = await googDrive.files.list({
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
      q: `'${folderId}' in parents${fileQuery ? ` and ${fileQuery}` : ' and trashed = false'}`,
      fields: 'files(id, name, mimeType, fullFileExtension)',
      spaces: 'drive'
    });
  } catch (e) {
    throw handleError(
      e, 
      `Failed to get file list for user '${userId}', and folder '${folderId}'`,
      `Auth used: '${auth}'`,
      `Credential path from env: '${keyFile}'`,
      `Scopes used: '${scopes}'`,
      `FileQuery used: '${fileQuery}'`,
      util.inspect(e, { depth: 6 })
    );
  }
  
  const objectStream = createObjectStream(transformer);
  if (outputDirectory) {
    objectStream.on('data', writeToDirectory.bind(null, outputDirectory, (e, msg) => {
      throw handleError(e, msg);
    }));
  }

  // Download the files from the content folder in series to avoid 403 limits
  const files = [];
  Array.prototype.push.apply(files, listRes.data.files);
  startObjectFlow(googDrive, files, objectStream, exportMimeMap);

  return objectStream;
}

export default extractTransform;
