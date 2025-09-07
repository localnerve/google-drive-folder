const { testFn } = require('./functions');

(async function test () {
  const { default: gdf } = await import('package');
  await testFn(gdf, 0);

  const { googleDriveFolder } = await import('package');
  await testFn(googleDriveFolder, 1);
})();