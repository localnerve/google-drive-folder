/**
 * Setup the installed package and run different tests loading the package in different ways.
 *
 * Copyright (c) 2021 - 2025 Alex Grant (@localnerve), LocalNerve LLC
 * Licensed under the MIT license.
 */
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const tar = require('tar');
const { globSync } = require('glob');
const thisDirname = __dirname;
const localNodeModulesPath = path.join(thisDirname, 'node_modules');

/**
 * Run the package tests
 */
async function runTests () {
  console.log('--- Run tests ---');

  const testGlob = path.join(thisDirname, 'test-*');
  const errors = [];
  const testFiles = globSync(testGlob);
  let result;
  
  for (const testFile of testFiles) {
    const testFileShort = path.basename(testFile);

    console.log(`=== start ${testFileShort} ===`);
    console.warn(`GCP check will fail and emit a MetadataLookupWarning. It\'s fine.
  https://github.com/googleapis/google-auth-library-nodejs/blob/main/src/auth/googleauth.ts#L475
  https://github.com/googleapis/gcp-metadata/blob/main/src/index.ts#L398`);
    
    await new Promise((resolve, reject) => {
      // const testProc = spawn('node', ['--trace-warnings', testFile], {
      const testProc = spawn('node', [testFile], {
        cwd: thisDirname,
        stdio: 'inherit',
        timeout: 40000
      });
      testProc.on('error', reject);
      testProc.on('close', code => {
        if (code !== 0) {
          const msg = `${testFileShort} failed, ${result.status}`;
          console.error(msg);
          errors.push(msg);
          console.log(`=== ${testFileShort} FAIL ===`);
        } else {
          console.log(`=== ${testFileShort} OK ===`);
        }
        resolve();
      });
    });
  }

  if (errors.length > 0) {
    throw new Error(errors.join('\n'));
  }
}

/**
 * Run `npm run transpile`
 * @returns Promise that resolves on success, rejects with msg on error
 */
function transpile () {
  console.log('--- transpile ---');
  return new Promise((resolve, reject) => {
    const transpile = spawn('npm', ['run', 'transpile']);
    transpile.on('close', transpileCode => {
      if (transpileCode === 0) {
        resolve();
      } else {
        reject(`npm run transpile failed: ${transpileCode}`);
      }
    });    
  });
}

/**
 * Run `npm pack`
 * @returns Promise that resolves on success, rejects with msg on error
 */
function pack () {
  console.log('--- package ---');
  return new Promise((resolve, reject) => {
    const pack = spawn('npm', ['pack']);
    pack.on('close', packCode => {
      if (packCode === 0) {
        resolve();
      } else {
        reject(`npm pack failed: ${packCode}`);
      }
    });
  });
}

/**
 * Run `npm i`
 * @returns Promise that resolves on success, rejects with msg on error
 */
function install () {
  console.log('--- install ---');
  return new Promise((resolve, reject) => {
    const install = spawn('npm', ['i', '--production=true'], {
      cwd: `${localNodeModulesPath}/package`
    });
    install.on('close', installCode => {
      if (installCode === 0) {
        resolve();
      } else {
        reject(`failed npm install: ${installCode}`);
      }
    });
  });
}

/**
 * Extract the npm packed tar to local node_modules.
 */
function extractTarPackage () {
  console.log('--- extract ---');

  const tarGlob = 'localnerve-google-drive-folder*';
  const tarFileName = globSync(tarGlob)[0];

  // clean any existing local node_modules
  fs.rmSync(localNodeModulesPath, { force: true, recursive: true });
  fs.mkdirSync(localNodeModulesPath, { recursive: true });
  
  // unpack it to local `node_modules`
  tar.x({
    C: localNodeModulesPath,
    file: tarFileName,
    sync: true
  });

  // remove old tar file
  fs.rmSync(tarFileName);

  return Promise.resolve();
}

console.log('----------------------------------------------------');
console.log('--- Test package install, loading, and integrity ---');
console.log('----------------------------------------------------');

transpile()
  .then(pack)
  .then(extractTarPackage)
  .then(install)
  .then(runTests);
