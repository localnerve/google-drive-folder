/**
 * test index functions.
 * 
 * Copyright (c) 2021 - 2022 Alex Grant (@localnerve), LocalNerve LLC
 * Licensed under the MIT license.
 */
/* eslint-env jest */
const {
  mockStream, mockIndex, unmockIndex
} = require('test/mocks');

require('@babel/register');

describe('index', () => {
  let indexModule;

  beforeAll(() => {
    mockIndex(jest);
    indexModule = require('../index.js');
  });

  afterAll(() => {
    unmockIndex(jest);
  });

  test('should return stream', () => {
    // it does no arg checking
    return indexModule.default({}).then(result => {
      expect(result).toBeDefined();
      expect(result).toEqual(mockStream);
    });
  });
});
