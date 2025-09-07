const { testFn } = require('./functions');
const { default: gdf } = require('package');
const { googleDriveFolder } = require('package');

const functions = [
  gdf,
  googleDriveFolder
];

(async function test () {
  for (let i = 0; i < functions.length; i++) {
    await testFn(functions[i], i);
  }
})();
