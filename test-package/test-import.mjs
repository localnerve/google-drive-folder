import { testFn } from './functions.js';
import gdf from 'package';
import { googleDriveFolder } from 'package';
import * as gdfSpace from 'package';

[
  gdf,
  googleDriveFolder,
  gdfSpace.default,
  gdfSpace.googleDriveFolder
].forEach(testFn);