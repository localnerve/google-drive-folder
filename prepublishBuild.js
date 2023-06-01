/**
 * Perform prepublishOnly build actions.
 * 
 * Copyright (c) 2021 - 2023 Alex Grant (@localnerve), LocalNerve LLC
 * Licensed under the MIT license.
 */
const fs = require('fs/promises');

(async function makeModuleIndex () {
  const indexJs = './index.js';
  const indexMjs = './dist/index.mjs';
  const contents = await fs.readFile(indexJs, { encoding: 'utf8' });
  await fs.writeFile(
    indexMjs,
    contents.replace('import extractTransform ', 'import { extractTransform } ')
  );
}());
