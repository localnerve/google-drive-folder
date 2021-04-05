/**
 * Write the processed drive content to a destination.
 * 
 * Copyright (c) 2021 Alex Grant (@localnerve), LocalNerve LLC
 * Private use for LocalNerve, LLC only. Unlicensed for any other use.
 */
/* eslint-env node */
import { promises as fs } from 'fs';
import { Readable } from 'stream';
import path from 'path';

/**
 * 
 * @param {Array<Object>} results - Array of objects containing the conversion results.
 * @returns {Promise} Resolves to Readable stream that pushes conversion result objects
 *   { input, output, converted }
 */
export async function createReadableStream(results) {
  return new Readable({
    objectMode: true,
    read() {
      results.forEach(result => this.push(result));
      this.push(null);
    }
  });
}

/**
 * Write the converted data objects contents to a directory.
 *
 * @param {String} outputDir - The output directory to put the files in.
 * @param {Array} results - An array of objects containing the conversion results.
 * @returns {Promise} Resolves to array of results from writing files to the directory.
 */
export async function writeToDirectory(outputDir, results) {
  return Promise.all(results.map(
    result => fs.writeFile(
      path.join(outputDir, `${result.output.name}${result.output.ext}`),
      result.output.data
    )
  ));
}

export default createReadableStream;
