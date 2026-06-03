/**
 * Google Drive Folder.
 * 
 * Download a google drive folder and stream it out.
 * Convert markdown and json. passthru the rest.
 * Write files to local directory if specified.
 * 
 * Copyright (c) 2021 - 2025 Alex Grant (@localnerve), LocalNerve LLC
 * Licensed under the MIT license.
 */
import { Readable } from 'node:stream';
import { extractTransform } from './lib/extract-transform.js';

/**
 * Google Drive Folder Extract, Transform, and Load.
 * Environment variable SVC_ACCT_CREDENTIALS is valid path to google credential file. 
 * @env SVC_ACCT_CREDENTIALS
 * Resolves to Readable object stream of objects 
 *   { input, output, converted }.
 *
 * @typedef {object} FolderOptions
 * @property {array} [scopes] - The scopes required by the account owner, defaults to `drive.readonly`.
 * @property {string} [fileQuery] - A query to filter the selection of files. @see https://developers.google.com/drive/api/v3/ref-search-terms
 * @property {object} [exportMimeMap] - The mime-types to use for export conversions. @see https://developers.google.com/drive/api/v3/ref-export-formats
 * @property {string} [outputDirectory] - The path to the output folder. If defined, writes to directory during object stream.
 * @property {function} [transformer] - Function receives downloaded input, returns Promise resolves to output data.
 * 
 * @param {string} folderId - The folderId of the drive to read from.
 * @param {string} userId - The userId of the owner of the drive. 
 * @param {FolderOptions} [options] - Additional options.
 * @returns {Promise<Readable>} A Node.js Readable instance, unless outputDirectory was supplied.
 */
async function googleDriveFolder(folderId, userId, options = {}) {
  return await extractTransform(folderId, userId, options);
}

export default googleDriveFolder;
export { googleDriveFolder };
