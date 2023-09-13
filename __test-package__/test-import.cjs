const { testFn } = require('./functions');

import('package').then(({ default: gdf }) => {
  testFn(gdf, 0);

  import('package').then(({ googleDriveFolder }) => {
    testFn(googleDriveFolder, 1);
  });
});
