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
 *  process.env.SVC_ACCT_CREDENTIALS
 *
 * @param {Object} googleDriveInfo - Google Drive information object.
 * @param {String} googleDriveInfo.folderId - The folderId of the drive to read from.
 * @param {String} googleDriveInfo.userId - The userId of the owner of the drive.
 * @param {Array} [googleDriveInfo.scopes] - The scopes required by the account owner, defaults to drive.readonly.
 * @param {Object} destinationInfo - Destination information object.
 * @param {String} destinationInfo.outputDirectory - The full path to the destination folder. Default undefined.
 * IF undefined, will return a ReadableStream.
 * @returns {Promise} ReadableStream, unless outputDirectory was supplied.
 */
export default async function googleDriveETL(googleDriveInfo, destinationInfo) {
  const { folderId, userId, scopes } = googleDriveInfo;
  const { outputDirectory } = destinationInfo;
  const readStream = !outputDirectory;

  const writer = writeToDirectory.bind(null, outputDirectory);
  const next = readStream ? createReadableStream : writer;

  return extractTransform(folderId, userId, scopes).then(next);
}
