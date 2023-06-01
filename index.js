/**
 * Google Drive Folder.
 * 
 * Download a google drive folder and stream it out.
 * Convert markdown and json. passthru the rest.
 * Write files to local directory if specified.
 * 
 * Copyright (c) 2021 - 2023 Alex Grant (@localnerve), LocalNerve LLC
 * Licensed under the MIT license.
 */
/* eslint-env node */
import extractTransform from './lib/extract-transform.js';

/**
 * Google Drive Folder Extract, Transform, and Load.
 * Environment variable SVC_ACCT_CREDENTIALS is valid path to google credential file. 
 * @env SVC_ACCT_CREDENTIALS
 * Resolves to Readable object stream of objects 
 *   { input, output, converted }.
 *
 * @param {String} folderId - The folderId of the drive to read from.
 * @param {String} userId - The userId of the owner of the drive. 
 * @param {Object} [options] - Additional options.
 * @param {Array}  [options.scopes] - The scopes required by the account owner, defaults to `drive.readonly`.
 * @param {String} [options.fileQuery] - A query to filter the selection of files.
 *   @see https://developers.google.com/drive/api/v3/ref-search-terms
 * @param {Object} [options.exportMimeMap] - The mime-types to use for export conversions.
 *   @see https://developers.google.com/drive/api/v3/ref-export-formats
 * @param {String} [options.outputDirectory] - The path to the output folder. If defined, writes to directory during object stream.
 * @param {Function} [options.transformer] - Function receives downloaded input, returns Promise resolves to output data.
 * @returns {Promise} ReadableStream, unless outputDirectory was supplied.
 */
export default async function googleDriveFolder(folderId, userId, options = {}) {
  return await extractTransform(folderId, userId, options);
}
