/**
 * test load functions.
 * 
 * Copyright (c) 2021 - 2025 Alex Grant (@localnerve), LocalNerve LLC
 * Licensed under the MIT license.
 */
import { describe, test, before, after, mock } from 'node:test';
import assert from 'node:assert';
import path from 'node:path';
import {
  emulateError,
  mockFs
} from './mocks.js';

describe('load', () => {
  const dir = 'testDir';
  const name = 'bing';
  const ext = '.bang';
  const data = 'muchmuchdata';
  let writeToDirectory, createObjectStream, ObjectTransformStream;

  before(async () => {
    mockFs(mock);
    ({ writeToDirectory, createObjectStream, ObjectTransformStream } = await import(`../lib/load.js?version=${Date.now()}`));
  });

  after(() => {
    mock.restoreAll();
  });

  test('createObjectStream returns ObjectTransformStream', () => {
    const stream = createObjectStream(() => {});
    assert.ok(stream instanceof ObjectTransformStream);
  });
  
  test('createObjectStream composes with transformer', async t => {
    const mockData = 'mockData';
    const mockTransformer = t.mock.fn(
      passedData => {
        assert.strictEqual(passedData, mockData);
        return Promise.resolve();
      }
    );

    const stream = createObjectStream(mockTransformer);
    await stream._transform(mockData, '', () => {});

    assert.strictEqual(mockTransformer.mock.callCount(), 1);
  });

  test('writeToDirectory calls async writeFile', () => {
    return writeToDirectory(dir, ()=> {}, {
      output: { name, ext, data }
    }).then(result => {
      assert.strictEqual(result.path, path.join(dir, `${name}${ext}`));
      assert.strictEqual(result.data, data);
    });
  });

  test('writeToDirectory fails as expected', () => {
    let called = false;

    return new Promise((resolve, reject) => {
      function handleError (e, msg) {
        called = true;
        assert.strictEqual(e.message, emulateError.message);
        assert.match(msg, new RegExp(path.join(dir, `${name}${ext}`)));
        resolve();
      }

      writeToDirectory(dir, handleError, {
        output: { name, ext, data: emulateError.message }
      });

      setTimeout(() => {
        if (!called) {
          reject(new Error('Did not call error handler in time'));
        }
      }, 200);
    });
  });
});
