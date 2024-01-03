/**
 * test extract-transform functions.
 * 
 * Copyright (c) 2021 - 2024 Alex Grant (@localnerve), LocalNerve LLC
 * Licensed under the MIT license.
 */
/* eslint-env jest */
const path = require('path');
const {
  mockExtractTransform, unmockExtractTransform, mockOn,
  mockFiles, unmockFiles, mockFs, unmockFs,
  mockAuth, unmockAuth,
  emulateError, mockTestChunk, mockGoogleapis
} = require('test/mocks');
require('@babel/register');

describe('extract-transform', () => {
  let etModule;
  const processError = emulateError;
  let mockWriteFile;

  beforeAll(() => {
    mockExtractTransform(jest);
    mockWriteFile = mockFs(jest);
    etModule = require('../lib/extract-transform');
  });

  afterAll(() => {
    unmockFs(jest);
    unmockExtractTransform(jest);
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
        expect(result).toBeDefined();
        expect(result.name).toEqual(path.parse(file.name).name);
        expect(result.ext).toEqual(path.parse(file.name).ext);
        expect(result.data).toEqual(mockTestChunk);
      });
    });

    test('should fail', () => {
      mockOn.skipError = false;
      return etModule.downloadFile(drive, file).then(result => {
        throw new Error(`should not have succeeded: ${require('util').inspect(result)}`);
      }, err => {
        expect(err).toEqual(processError);
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

    function filterByType(type, files) {
      return files.filter(file => file.mimeType.includes(type));
    }

    test('should return stream', () => {
      return etModule.extractTransform('101010', 'user@domain.dom')
        .then(result => {
          expect(result).toBeDefined();
          expect(result).toBeInstanceOf(require('../lib/load').ObjectTransformStream);
        });
    });

    test('should throw on drive list failure', async () => {
      let result;
      function complete(e) {
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
        expect(e).toEqual(emulateError);
        result = complete();
      }

      if (result) {
        throw result;
      }
    });

    test('should error on download failure', done => {
      mockFiles(files, null, false, true);

      etModule.extractTransform('iMaFiLeIdOfSoMeKiNd', 'user@domain.dom', {
        outputDirectory: 'tmp/to/nowhere'
      }).then(stream => {
        stream.on('data', () => {
          done(new Error('received unexpected data'));
        });
        stream.on('error', err => {
          expect(err).toEqual(emulateError);
          unmockFiles();
          done();
        });
      });
    });

    test('should send data, correct structure, ref input on passthru', done => {
      mockFiles(files);
      counter = 0;
      etModule.extractTransform('101010', 'user@domain.dom')
        .then(stream => {
          stream.on('data', obj => {
            expect(obj).toBeDefined();
            expect(obj).toHaveProperty('input.name');
            expect(obj).toHaveProperty('input.ext');
            expect(obj).toHaveProperty('input.data');
            expect(obj).toHaveProperty('input.binary');
            expect(obj).toHaveProperty('input.downloadMeta');
            expect(obj).toHaveProperty('output.name');
            expect(obj).toHaveProperty('output.ext');
            expect(obj).toHaveProperty('output.data');
            expect(obj).toHaveProperty('converted');
            expect(obj.converted).toBeFalsy();
            expect(obj.input.name).toEqual(obj.output.name);
            expect(parseInt(obj.output.name)).toEqual(counter); // order
            expect(obj.output.ext).toEqual(`.${files[counter].name.split('.')[1]}`);
            counter++;
          });
          stream.on('end', () => {
            expect(counter).toEqual(files.length);
            unmockFiles();
            done();
          });
          stream.on('error', err => {
            unmockFiles();
            done(err);
          });
        });
    });

    test('handle write errors', done => {
      function complete() {
        mockWriteFile.mockClear();
        unmockFiles();
        done();
      }
      mockOn.writeError = true;
      mockFiles(files);
      mockWriteFile.mockClear();

      counter = 0;
      etModule.extractTransform('iMaFiLeIdOfSoMeKiNd', 'user@domain.dom', {
        outputDirectory: 'tmp/to/nowhere'
      })
        .then(stream => {
          stream.on('error', e => {
            expect(e).toEqual(emulateError);
            complete();
          });
        });
    });

    test('should send data and write file when outputDirectory is specified', done => {
      function complete(e) {
        mockWriteFile.mockClear();
        unmockFiles();
        done(e);
      }
      mockFiles(files);
      mockWriteFile.mockClear();

      counter = 0;
      etModule.extractTransform('iMaFiLeIdOfSoMeKiNd', 'user@domain.dom', {
        outputDirectory: 'tmp/to/nowhere'
      })
        .then(stream => {
          stream.on('data', data => {
            expect(data.input.binary).toBeFalsy();
            expect(data.output.data).toEqual('myspecialtestchunk');
            counter++;
          });
          stream.on('end', () => {
            expect(counter).toEqual(files.length);
            expect(mockWriteFile.mock.calls.length).toEqual(files.length);
            complete();
          });
          stream.on('error', e => {
            complete(e);
          });
        });
    });

    test('should use auth if supplied', done => {
      function complete(e) {
        unmockAuth();
        done(e);
      }

      mockAuth(() => {
        done(new Error('should have used supplied auth and not have called GoogleAuth'));
      });

      etModule.extractTransform('123456789', 'user@domain.dom', {
        auth: () => {}
      }).then(() => {
        complete();
      }).catch(complete);
    });

    test('should use GoogleAuth if no auth supplied', done => {
      function complete(e) {
        unmockAuth();
        done(e);
      }

      mockAuth(() => {
        complete();
      });

      etModule.extractTransform('123456789', 'user@domain.dom')
        .then(() => {})
        .catch(complete);
    });

    test('should send Buffer if binary content', done => {
      function complete(e) {
        unmockFiles();
        done(e);
      }
      mockFiles(binaryFiles);
      counter = 0;
      etModule.extractTransform('101010', 'user@domain.dom')
        .then(stream => {
          stream.on('data', data => {
            expect(data.input.binary).toEqual(true);
            expect(data.output.data).toBeInstanceOf(Buffer);
            counter++;
          });
          stream.on('end', () => {
            expect(counter).toEqual(binaryFiles.length);
            complete();
          });
          stream.on('error', e => {
            complete(e);
          })
        });
    });

    test('should filter files if fileQuery is specified', done => {
      function complete(e) {
        unmockFiles();
        done(e);
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
            expect(counter).toEqual(2); // only 2 google-apps.document in fileWithMimeTypes
            complete();
          });
          stream.on('error', e => {
            complete(e);
          });
        });
    });

    test('should run export if exportMimeMap', done => {
      function complete(e) {
        unmockFiles();
        done(e);
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
            expect(data.output.downloadMeta.method).toEqual('export');
            expect(data.output.downloadMeta.parameters.mimeType).toEqual(mimeType);
            counter++;
          });
          stream.on('end', () => {
            expect(counter).toEqual(2);
            complete();
          });
          stream.on('error', e => {
            complete(e);
          });
        });
    });
  });
});
