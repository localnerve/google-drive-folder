/**
 * test load functions.
 */
/* eslint-env jest */
const { mockLoad, unmockLoad, emulateError } = require('test/mocks');
const path = require('path');
require('@babel/register');

describe('load', () => {
  let moduleLoad;
  const dir = 'testDir';
  const name = 'bing';
  const ext = '.bang';
  const data = 'muchmuchdata';


  beforeAll(() => {
    mockLoad(jest);
    moduleLoad = require('../lib/load');
  });

  afterAll(() => {
    unmockLoad(jest);
  });

  test('createObjectStream returns ObjectTransformStream', done => {
    const stream = moduleLoad.createObjectStream(() => {});
    expect(stream).toBeDefined();
    expect(stream).toBeInstanceOf(moduleLoad.ObjectTransformStream);
    done();
  });
  
  test('createObjectStream composes with transformer', done => {
    const mockData = 'mockData';
    const mockTransformer = jest.fn(
      passedData => {
        expect(passedData).toEqual(mockData);
        return Promise.resolve({});
      }
    );

    const stream = moduleLoad.createObjectStream(mockTransformer);
    stream._transform(mockData, '', () => {});

    expect(mockTransformer.mock.calls.length).toEqual(1);
    done();
  });

  test('writeToDirectory calls async writeFile', () => {
    return moduleLoad.writeToDirectory(dir, ()=> {}, {
      output: { name, ext, data }
    }).then(result => {
      expect(result).toBeDefined;
      expect(result.path).toEqual(path.join(dir, `${name}${ext}`));
      expect(result.data).toEqual(data);
    });
  });

  test('writeToDirectory fails as expected', done => {
    let called = false;

    function handleError(e, msg) {
      called = true;
      expect(e).toEqual(emulateError);
      expect(msg).toContain(path.join(dir, `${name}${ext}`));
      done();
    }

    moduleLoad.writeToDirectory(dir, handleError, {
      output: { name, ext, data: emulateError }
    });

    setTimeout(() => {
      if (!called) {
        done(new Error('Did not call error handler in time'));
      }
    }, 200);
  });
});
