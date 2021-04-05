/**
 * Google Drive ETL.
 * 
 * Copyright (c) 2021 Alex Grant (@localnerve), LocalNerve LLC
 * Private use for LocalNerve, LLC only. Unlicensed for any other use.
 */
/* eslint-env node */
import extractTransform from './lib/extract-transform';
import { writeToDirectory, createReadableStream } from './lib/load';

/**
 * Google Drive Folder Extract, Transform, and Load.
 * Environment variable SVC_ACCT_CREDENTIALS is valid path to google credential file. 
 * @env SVC_ACCT_CREDENTIALS
 * Resolves to Readable object stream of objects 
 *   { input: { data, name, ext }, output: { data, name, ext }, converted: Boolean }.
 * 
 * @param {Object} googleDriveInfo - Google Drive information object.
 * @param {String} googleDriveInfo.folderId - The folderId of the drive to read from.
 * @param {String} googleDriveInfo.userId - The userId of the owner of the drive.
 * @param {Array} [googleDriveInfo.scopes] - The scopes required by the account owner, defaults to `drive.readonly`.
 * @param {Object} [options] - Additional options.
 * @param {String} [options.outputDirectory] - The path to the output folder. If defined, writes to directory instead of returning stream.
 * @param {Function} [options.logger] - Logger function for error output.
 * @returns {Promise} ReadableStream, unless outputDirectory was supplied.
 */
export default async function googleDriveETL(googleDriveInfo, options = {}) {
  const { folderId, userId, scopes } = googleDriveInfo;
  const { outputDirectory, logger = () => {} } = options;
  const readStream = !outputDirectory;

  const writer = writeToDirectory.bind(null, outputDirectory);
  const next = readStream ? createReadableStream : writer;

  let result;
  try {
    result = await extractTransform(folderId, userId, scopes).then(next); 
  }
  catch(e) {
    logger(e);
    throw e;
  }
  return result;
}
