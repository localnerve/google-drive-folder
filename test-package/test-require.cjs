const { testFn } = require('./functions');
const { default: gdf } = require('package');
const { googleDriveFolder } = require('package');

[
  gdf,
  googleDriveFolder
].forEach(testFn);