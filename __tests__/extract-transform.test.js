/**
 * test extract-transform functions
 */
/* eslint-env jest */
const path = require('path');
const {
  mockExtractTransform, unmockExtractTransform, mockOn,
  mockFiles, unmockFiles, mockFs, unmockFs,
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
  
  describe('convertFile', () => {
    const input = {
      data: {
        mockProcessError: false,
        mockProcessResult: 'somemarkdown'
      },
      name: 'mock',
      ext: '.md'
    };

    test('markdown should succeed', () => {
      return etModule.convertFile(input).then(result => {
        expect(result).toBeDefined();
        expect(result.output).toBeDefined();
        expect(result.output.data).toEqual(input.data.mockProcessResult);
        expect(result.output.name).toEqual(input.name);
        expect(result.output.ext).toEqual('.html');
        expect(result.converted).toEqual(true);
        // console.log('@@@ convert result', result);
      });
    });
    
    test('markdown should fail', () => {
      input.data.mockProcessError = processError;
      
      // console.error('EXPECTED ERROR:\n');
      return etModule.convertFile(input)
        .then(result => {
          // console.log('@@@ result', result);
          throw new Error(`Should not have succeeded: ${require('util').inspect(result)}`);
        }, err => {
          // input.data.mockProcessError = false;
          expect(err).toEqual(processError);
        })
        .finally(() => {
          input.data.mockProcessError = false;
        });
    });

    test('json should succeed', () => {
      const jsonData = JSON.stringify(input);
      input.ext = '.json';
      input.data = jsonData;

      return etModule.convertFile(input).then(result => {
        expect(result).toBeDefined();
        expect(result.output).toBeDefined();
        expect(result.output.data).toEqual(jsonData);
        expect(result.output.ext).toEqual('.json');
        expect(result.converted).toEqual(true);
      }).then(() => {
        input.data = JSON.parse(jsonData);
      });
    });

    test('passthru should succeed', () => {
      input.ext = 'unknown';

      return etModule.convertFile(input).then(result => {
        expect(result).toBeDefined();
        expect(result.input).toEqual(input);
        expect(result.converted).toEqual(false);
      });
    });
  });

  describe('downloadFile', () => {
    const file = {
      id: '101010',
      name: 'mockFile.mockExt'
    };
    const drive = mockGoogleapis.google.drive();

    test('should succeed', () => {
      mockOn.skipError = true;

      return etModule.downloadFile(drive, file).then(result => {
        expect(result).toBeDefined();
        expect(result.name).toEqual(path.parse(file.name).name);
        expect(result.ext).toEqual(path.parse(file.name).ext);
        expect(result.data).toEqual(mockTestChunk);
        // console.log('@@@ result', result);
      }).finally(() => {
        mockOn.skipError = false;
      });
    });

    test('should fail', () => {
      // console.error('EXPECTED ERROR:\n');
      return etModule.downloadFile(drive, file).then(result => {
        throw new Error(`should not have succeeded: ${require('util').inspect(result)}`);
      }, err => {
        expect(err).toEqual(processError);
        // console.log('@@@ successful fail', err);
      });
    });
  });

  describe('extractTransform', () => {
    let counter = 0;
    const files = [{
      name: '0.passthru',
      id: '123123123'
    }, {
      name: '1.passthru',
      id: '456456456'
    }];

    test('should return stream', () => {
      mockOn.skipError = true;
      return etModule.extractTransform('101010', 'user@domain.dom')
        .then(result => {
          expect(result).toBeDefined();
          expect(result).toBeInstanceOf(require('../lib/load').ObjectTransformStream);
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

    test('should send data and write file when outputDirectory is specified', done => {
      function complete(e) {
        unmockFiles();
        done(e);
      }
      mockFiles(files);
      mockWriteFile.mockClear();

      counter = 0;
      etModule.extractTransform('123123', 'user@domain.dom', [], 'tmp/to/nowhere')
        .then(stream => {
          stream.on('data', () => {
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
  });
});
