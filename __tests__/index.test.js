/**
 * test index functions.
 * 
 * Copyright (c) 2021 - 2025 Alex Grant (@localnerve), LocalNerve LLC
 * Licensed under the MIT license.
 */
import { describe, test, before, after, mock } from 'node:test';
import assert from 'node:assert';

describe('index', () => {
  const mockStream = 'mockStream';
  const extractTransformLib = import.meta.resolve('../lib/extract-transform.js');
  let indexModule;

  before(async () => {
    mock.module(extractTransformLib, {
      exports: {
        extractTransform: () => Promise.resolve(mockStream)
      }
    });
    indexModule = await import(`../index.js?version=${Date.now()}`);
  });

  after(() => {
    mock.restoreAll();
  });

  test('should return stream', () => {
    return indexModule.default({}).then(result => {
      assert.strictEqual(result, mockStream);
    });
  });
});
