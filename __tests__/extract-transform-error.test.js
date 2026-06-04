/**
 * test extract-transform stream errors.
 * 
 * Copyright (c) 2021 - 2025 Alex Grant (@localnerve), LocalNerve LLC
 * Licensed under the MIT license.
 */
import { test, describe, before, mock, afterEach } from 'node:test';
import assert from 'node:assert';
import { finished } from 'node:stream/promises'; 
import { 
  mockExtractTransform, 
  mockFiles, 
  unmockFiles,
  mockGoogleapis,
  mockOn
} from './mocks.js';

describe('Extract-Transform Simulated Disk Error', () => {
  let extractTransform;

  before(async () => {
    const loadModuleUrl = import.meta.resolve('../lib/load.js');
    mock.module(loadModuleUrl, {
      namedExports: {
        createObjectStream: (await import(loadModuleUrl)).createObjectStream,
        writeToDirectory: (outputDir, handleErrorCallback) => {
          const fakeDiskError = new Error('ENOSPC: No space left on device');
          handleErrorCallback(fakeDiskError, 'Simulated write to directory failure hook');
        }
      }
    });
    mockExtractTransform(mock);
    ({ extractTransform } = await import('../lib/extract-transform.js'));
  });

  afterEach(() => {
    unmockFiles();
    delete mockOn.writeError;
    delete mockOn.skipError;
    mock.restoreAll();
  });

  test('should halt download loops immediately upon encountering a file system write error', async () => {
    const testFiles = [
      { id: 'file-1', name: 'first-target.txt', mimeType: 'text/plain' },
      { id: 'file-2', name: 'second-target.txt', mimeType: 'text/plain' },
      { id: 'file-3', name: 'third-target.txt', mimeType: 'text/plain' }
    ];

    mockFiles(testFiles);

    mockOn.writeError = false; // Let writeToDirectory mock above error
    mockOn.skipError = true;

    const fakeDriveInstance = mockGoogleapis.drive();
    const spyDriveGet = mock.method(fakeDriveInstance.files, 'get');
    mock.method(mockGoogleapis, 'drive', () => fakeDriveInstance);

    const activeStreamPipeline = await extractTransform('iMaFiLeIdOfSoMeKiNd', 'user@domain.dom', {
      outputDirectory: 'tmp/to/nowhere'
    });

    try {
      await finished(activeStreamPipeline);
      assert.fail('The pipeline should have failed due to disk error');
    } catch (err) {
      assert.strictEqual(activeStreamPipeline.destroyed, true);
      assert.ok(spyDriveGet.mock.callCount() < testFiles.length);
      
      // Assert against the actual thrown error instance
      assert.match(err.message, /ENOSPC: No space left on device/);

      if (activeStreamPipeline.errored) {
        assert.match(activeStreamPipeline.errored.message, /Simulated write to directory failure hook/);
      }
    }
  });
});
