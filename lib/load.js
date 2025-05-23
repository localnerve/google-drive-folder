/**
 * Write the processed drive content to a destination.
 * 
 * Copyright (c) 2021 - 2025 Alex Grant (@localnerve), LocalNerve LLC
 * Licensed under the MIT license.
 */
/* eslint-env node */
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { Transform } from 'node:stream';

/**
 * ObjectTransformStream
 * A Transform stream that converts data.
 * 
 * The tranformer function takes an input object { data, name, ext }
 * and returns a promise that resolves to
 * {
 *   input: { data, name, ext }
 *   output: { data, name, ext }
 *   converted
 * }
 */
export class ObjectTransformStream extends Transform {
  #customError = null;

  constructor(opts) {
    const options = { ...opts, ...{ objectMode: true } };
    super(options);
    this.transformer = options.__transformer;
  }

  _transform(input, enc, cb) {
    this.transformer(input).then(data => {
      this.push(data);
      cb();
    }).catch(cb);
  }

  get customError () {
    return this.#customError;
  }

  set customError (error) {
    this.#customError = error;
  }
}

/**
 * Create the transform stream
 * 
 * @param {Function} transformer - function signature `Promise function ({ data, name, ext }).
 *   Returned promise resolves to { input: {data, name, ext}, output: {data, name, ext }, converted }`.
 * @returns {ObjectTransformStream} The object transform stream.
 */
export function createObjectStream(transformer) {
  return new ObjectTransformStream({
    __transformer: transformer
  });
}

/**
 * Write the converted data objects contents to a directory.
 *
 * @param {String} outputDir - The output directory to put the files in.
 * @param {Function} handleError - handle output errors.
 * @param {Object} data - Completed data object.
 * @returns {Promise} Resolves to array of results from writing files to the directory.
 */
export async function writeToDirectory(outputDir, handleError, data) {
  const outputPath = path.join(outputDir, `${data.output.name}${data.output.ext}`);
  return fs.writeFile(outputPath, data.output.data)
    .catch(e => {
      handleError(e, `Failed to write file '${outputPath}'`);
    });
}

