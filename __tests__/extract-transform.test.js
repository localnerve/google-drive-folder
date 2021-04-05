/**
 * test extract-transform functions
 */
/* eslint-env jest */
const path = require('path');
require('@babel/register');

describe('extract-transform', () => {
  let etModule;
  const processError = new Error('emulatedError');
  const testChunk = 'myspecialtestchunk';
  function GoogleAuth() {
  }

  function mockOn(name, cb) {
    if (name ==='data' && this.on.skipError) {
      cb(Buffer.from(testChunk));
    } else if (name === 'end' && this.on.skipError) {
      cb();
    } else if (name === 'error' && !this.on.skipError) {
      cb(processError);
    }
    return this;
  }

  const mockGoogleapis = {
    google: {
      auth: {
        GoogleAuth
      },
      drive: () => ({
        files: {
          export: () => Promise.resolve({
            data: {
              on: mockOn
            }
          }),
          list: () => {
            return Promise.resolve({
              data: {
                files: [{
                  id: '101010',
                  name: 'test-file.passthru'
                }]
              }
            })
          }
        }
      })
    }
  };

  beforeAll(() => {
    jest.mock('googleapis', () => mockGoogleapis);
    jest.mock('remark-html');
    jest.mock('remark', () => () => ({
      use: () => ({
        process: (inputData, cb) => {
          if (inputData.mockProcessError) {
            cb(inputData.mockProcessError);
          }
          cb(null, inputData.mockProcessResult);
        }
      })
    }));

    etModule = require('../lib/extract-transform');
  });

  afterAll(() => {
    jest.unmock('googleapis');
    jest.unmock('remark');
    jest.unmock('remark-html');
  });
  
  describe('convert', () => {
    const input = {
      data: {
        mockProcessError: false,
        mockProcessResult: 'somemarkdown'
      },
      name: 'mock',
      ext: '.md'
    };

    test('markdown should succeed', () => {
      return etModule.convert(input).then(result => {
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
      
      console.error('EXPECTED ERROR:\n');
      return etModule.convert(input)
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

      return etModule.convert(input).then(result => {
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

      return etModule.convert(input).then(result => {
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
        expect(result.data).toEqual(testChunk);
        // console.log('@@@ result', result);
      }).finally(() => {
        mockOn.skipError = false;
      });
    });

    test('should fail', () => {
      console.error('EXPECTED ERROR:\n');
      return etModule.downloadFile(drive, file).then(result => {
        throw new Error(`should not have succeeded: ${require('util').inspect(result)}`);
      }, err => {
        expect(err).toEqual(processError);
        // console.log('@@@ successful fail', err);
      });
    });
  });

  describe('extractTransform', () => {
    test('should succeed', () => {
      mockOn.skipError = true;
      return etModule.extractTransform('101010', 'user@domain.dom').then(result => {
        // console.log('@@@ extractTransform result ', result);
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toEqual(true);
        expect(result[0]).toBeDefined();
        expect(result[0].input).toBeDefined();
        expect(result[0].output).toBeDefined();
        expect(result[0].converted).toBeDefined();
      });
    });
  });
});
