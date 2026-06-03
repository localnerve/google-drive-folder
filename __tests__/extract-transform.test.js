/**
 * test extract-transform functions.
 * 
 * Copyright (c) 2021 - 2025 Alex Grant (@localnerve), LocalNerve LLC
 * Licensed under the MIT license.
 */
import { describe, test, before, after, beforeEach, mock } from 'node:test';
import assert from 'node:assert';
import path from 'node:path';
import {
  emulateError, mockTestChunk, mockGoogleapis,
  mockExtractTransform, mockOn,
  mockFiles, unmockFiles, mockFs,
  mockAuth, unmockAuth
} from './mocks.js';

describe('extract-transform', () => {
  let etModule;
  const processError = emulateError;
  let mockWriteFile;

  before(async () => {
    mockExtractTransform(mock);
    mockWriteFile = mockFs(mock);
    etModule = await import(`../lib/extract-transform.js?version=${Date.now()}`);
  });

  after(() => {
    mock.restoreAll();
  });

  beforeEach(() => {
    mockOn.skipError = true;
    mockOn.writeError = false;
  });

  describe('downloadFile', () => {
    const file = {
      id: '101010',
      name: 'mockFile.mockExt',
      mimeType: 'some/type',
      fullFileExtension: undefined
    };
    /*
    const exportMimeMap = {
      'application/vnd.google-apps.document': 'text/plain'
    };
    */
    const drive = mockGoogleapis.drive();

    test('should succeed', () => {
      return etModule.downloadFile(drive, file).then(result => {
        assert.ok(result);
        assert.strictEqual(result.name, path.parse(file.name).name);
        assert.strictEqual(result.ext, path.parse(file.name).ext);
        assert.strictEqual(result.data, mockTestChunk);
      });
    });

    test('should fail', () => {
      mockOn.skipError = false;
      return etModule.downloadFile(drive, file).then(result => {
        throw new Error(`should not have succeeded: ${require('util').inspect(result)}`);
      }, err => {
        assert.strictEqual(err.message, processError.message);
      });
    });
  });

  describe('extractTransform', () => {
    let counter = 0;
    const googDocsType = 'application/vnd.google-apps.document';
    const files = [{
      name: '0.passthru',
      id: '123123123',
      mimeType: 'some/type',
      fullFileExtension: undefined
    }, {
      name: '1.passthru',
      id: '456456456',
      mimeType: 'some/type',
      fullFileExtension: undefined
    }];
    const binaryFiles = [{
      name: '0.bin',
      id: '567567567',
      mimeType: 'application/octet-stream',
      fullFileExtension: 'bin'
    }, {
      name: '1.bin',
      id: '789789789',
      mimeType: 'application/octet-stream',
      fullFileExtension: 'bin'
    }];
    const filesWithMimeTypes = [{
      name: '0.doc',
      id: '234234234',
      mimeType: googDocsType
    }, {
      name: '1.bin',
      id: '345345345',
      mimeType: 'image/jpeg'
    }, {
      name: '1.doc',
      id: '012012012',
      mimeType: googDocsType
    }];

    const docsType = googDocsType;

    function filterByType (type, files) {
      return files.filter(file => file.mimeType.includes(type));
    }

    test('should return stream', () => {
      return etModule.extractTransform('101010', 'user@domain.dom')
        .then(result => {
          assert.ok(result);
          assert.ok(result.constructor.name === 'ObjectTransformStream');
        });
    });

    test('should throw on drive list failure', async () => {
      let result;
      function complete (e) {
        unmockFiles();
        return e;
      }
      mockFiles(files, null, true);

      try {
        await etModule.extractTransform('iMaFiLeIdOfSoMeKiNd', 'user@domain.dom', {
          outputDirectory: 'tmp/to/nowhere'
        });
        result = complete(new Error('Should have thrown'));
      }
      catch (e) {
        assert.strictEqual(e.message, emulateError.message);
        result = complete();
      }

      if (result) {
        throw result;
      }
    });

    test('should error on download failure', () => {
      mockFiles(files, null, false, true);

      return new Promise((resolve, reject) => {
        etModule.extractTransform('iMaFiLeIdOfSoMeKiNd', 'user@domain.dom', {
          outputDirectory: 'tmp/to/nowhere'
        }).then(stream => {
          stream.on('data', () => {
            reject(new Error('received unexpected data'));
          });
          stream.on('error', err => {
            assert.strictEqual(err.message, emulateError.message);
            unmockFiles();
            resolve();
          });
        });
      });
    });

    test('should send data, correct structure, ref input on passthru', () => {
      mockFiles(files);
      counter = 0;
      return new Promise((resolve, reject) => {
        etModule.extractTransform('101010', 'user@domain.dom')
          .then(stream => {
            stream.on('data', obj => {
              assert.ok(obj);
              assert.ok(obj.input);
              assert.ok(obj.output);
              assert.ok(obj.converted === false);
              assert.ok(obj.input.name);
              assert.ok(obj.input.ext);
              assert.ok(obj.input.data);
              assert.ok('binary' in obj.input);
              assert.ok(obj.input.downloadMeta);
              assert.ok(obj.output.name);
              assert.ok(obj.output.ext);
              assert.ok(obj.output.data);
              assert.strictEqual(obj.input.name, obj.output.name);
              assert.strictEqual(parseInt(obj.output.name), counter); // order
              assert.strictEqual(obj.output.ext, `.${files[counter].name.split('.')[1]}`);
              counter++;
            });
            stream.on('end', () => {
              assert.strictEqual(counter, files.length);
              unmockFiles();
              resolve();
            });
            stream.on('error', err => {
              unmockFiles();
              reject(err);
            });
          });
      });
    });

    test('handle write errors', () => {
      return new Promise(resolve => {
        function complete () {
          mockWriteFile.mock.restore();
          mockWriteFile.mock.resetCalls();
          unmockFiles();
          resolve();
        }
        mockOn.writeError = true;
        mockFiles(files);
        mockWriteFile.mock.restore();
        mockWriteFile.mock.resetCalls();

        counter = 0;
        etModule.extractTransform('iMaFiLeIdOfSoMeKiNd', 'user@domain.dom', {
          outputDirectory: 'tmp/to/nowhere'
        })
          .then(stream => {
            stream.on('error', e => {
              assert.strictEqual(e.message, emulateError.message);
              complete();
            });
          });
      });
    });

    test('should send data and write file when outputDirectory is specified', () => {
      return new Promise((resolve, reject) => {
        function complete (e) {
          mockWriteFile.mock.restore();
          mockWriteFile.mock.resetCalls();
          unmockFiles();
          if (e) return reject(e);
          resolve();
        }
        mockFiles(files);
        mockWriteFile.mock.restore();
        mockWriteFile.mock.resetCalls();

        counter = 0;
        etModule.extractTransform('iMaFiLeIdOfSoMeKiNd', 'user@domain.dom', {
          outputDirectory: 'tmp/to/nowhere'
        })
          .then(stream => {
            stream.on('data', data => {
              assert.ok('binary' in data.input);
              assert.ok(!data.input.binary);
              assert.strictEqual(data.output.data, 'myspecialtestchunk');
              counter++;
            });
            stream.on('end', () => {
              assert.strictEqual(counter, files.length);
              assert.strictEqual(mockWriteFile.mock.callCount(), files.length);
              complete();
            });
            stream.on('error', e => {
              complete(e);
            });
          });
      });
    });

    test('should use auth if supplied', () => {
      return new Promise((resolve, reject) => {
        function complete (e) {
          unmockAuth();
          if (e) return reject(e);
          resolve();
        }

        mockAuth(() => {
          reject(new Error('should have used supplied auth and not have called GoogleAuth'));
        });

        etModule.extractTransform('123456789', 'user@domain.dom', {
          auth: () => {}
        }).then(() => {
          complete();
        }).catch(complete);
      });
    });

    test('should use GoogleAuth if no auth supplied', () => {
      return new Promise((resolve, reject) => {
        function complete (e) {
          unmockAuth();
          if (e) return reject(e);
          resolve();
        }

        mockAuth(() => {
          complete();
        });

        etModule.extractTransform('123456789', 'user@domain.dom')
          .then(() => {})
          .catch(complete);
      });
    });

    test('should send Buffer if binary content', () => {
      return new Promise((resolve, reject) => {
        function complete (e) {
          unmockFiles();
          if (e) return reject(e);
          resolve();
        }
        mockFiles(binaryFiles);
        counter = 0;
        etModule.extractTransform('101010', 'user@domain.dom')
          .then(stream => {
            stream.on('data', data => {
              assert.ok(data.input.binary);
              assert.ok(data.output.data instanceof Buffer);
              counter++;
            });
            stream.on('end', () => {
              assert.strictEqual(counter, binaryFiles.length);
              complete();
            });
            stream.on('error', e => {
              complete(e);
            })
          });
      });
    });

    test('should filter files if fileQuery is specified', () => {
      return new Promise((resolve, reject) => {
        function complete (e) {
          unmockFiles();
          if (e) return reject(e);
          resolve();
        }

        mockFiles(filesWithMimeTypes, filterByType.bind(null, docsType));
        counter = 0;
        etModule.extractTransform('imASimpleFolderId', 'owner@ofFolder.dom', {
          fileQuery: `mimeType = "application/vnd.${docsType}"`
        })
          .then(stream => {
            stream.on('data', () => {
              counter++;
            });
            stream.on('end', () => {
              assert.strictEqual(counter, 2); // only 2 google-apps.document in fileWithMimeTypes
              complete();
            });
            stream.on('error', e => {
              complete(e);
            });
          });
      });
    });

    test('should run export if exportMimeMap', () => {
      return new Promise((resolve, reject) => {
        function complete (e) {
          unmockFiles();
          if (e) return reject(e);
          resolve();
        }

        const mimeType = 'text/plain';
        mockFiles(filesWithMimeTypes, filterByType.bind(null, docsType));
        counter = 0;
        etModule.extractTransform('asdfasdfasdf', 'owner@folder.com', {
          exportMimeMap: {
            [googDocsType]: mimeType
          }
        })
          .then(stream => {
            stream.on('data', data => {
              assert.strictEqual(data.output.downloadMeta.method, 'export');
              assert.strictEqual(data.output.downloadMeta.parameters.mimeType, mimeType);
              counter++;
            });
            stream.on('end', () => {
              assert.strictEqual(counter, 2);
              complete();
            });
            stream.on('error', e => {
              complete(e);
            });
          });
      });
    });
  });
});
