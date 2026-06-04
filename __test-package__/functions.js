/**
 * test functions for the test suite
 * 
 * Copyright (c) 2021 - 2025 Alex Grant (@localnerve), LocalNerve LLC
 * Licensed under the MIT license.
 */
import assert from 'node:assert';

export async function testFn (fn, i) {
  console.log(`=== testing ${fn.name}:${i} ===`);
  assert(typeof fn === 'function');
  let threw = false;
  try {
    await fn();
  } catch (err) {
    assert(err instanceof Error);
    assert(/default credentials/i.test(err));
    threw = true;
  }
  assert(threw, 'default should have thrown default credentials error');  
}