/**
 * test index functions.
 */
/* eslint-env jest */
const {
  mockReadableStream, mockWriteResult, mockTransformResult, mockLib, unmockLib
} = require('test/mocks');

require('@babel/register');

describe('index', () => {
  let indexModule;

  beforeAll(() => {
    mockLib(jest);
    indexModule = require('../index.js');
  });

  afterAll(() => {
    unmockLib(jest);
  });

  test('default should return ReadableStream', () => {
    return indexModule.default({}, {}).then(result => {
      expect(result).toBeDefined();
      expect(result.id).toEqual(mockReadableStream);
    });
  });

  test('outputDirectory should call file writer', () => {
    return indexModule.default({}, { outputDirectory: './tmp' })
      .then(results => {
        expect(Array.isArray(results)).toBe(true);
        expect(results[0]).toEqual(mockWriteResult);
      });
  });

  test('calls extactTransform first', () => {
    return indexModule.default({}, {}).then(result => {
      expect(result).toBeDefined();
      expect(Array.isArray(result.first)).toBe(true);
      expect(result.first[0]).toEqual(mockTransformResult);
    });
  });
});
