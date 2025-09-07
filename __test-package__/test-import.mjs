import { testFn } from './functions.js';
import gdf from 'package';
import { googleDriveFolder } from 'package';
import * as gdfSpace from 'package';

const functions = [
  gdf,
  googleDriveFolder,
  gdfSpace.default,
  gdfSpace.googleDriveFolder
];

(async function test () {
  for (let i = 0; i < functions.length; i++) {
    await testFn(functions[i], i);
  }
})();