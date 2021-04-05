/**
 * test load functions.
 */
/* eslint-env jest */
const path = require('path');
require('@babel/register');

describe('load', () => {
  let moduleLoad;

  beforeAll(() => {
    jest.mock('fs', () => ({
      promises: {
        writeFile: (path, data) => {
          return Promise.resolve({
            path,
            data
          });
        }
      }
    }));
    moduleLoad = require('../lib/load');
  });

  afterAll(() => {
    jest.unmock('fs');
  });

  test('createReadableStream Readable events work as expected', done => {
    const results = [{
      id: 'one',
      index: 0,
    }, {
      id: 'two',
      index: 1
    }];

    let counter = 0;

    Promise.resolve(moduleLoad.createReadableStream(results)).then(stream => {
      expect(stream).toBeDefined();
      expect(typeof stream.on).toEqual('function');

      stream.on('data', obj => {
        expect(obj).toEqual(results[counter]);
        expect(obj.index).toEqual(counter);
        counter++;
      });
      stream.on('end', () => {
        expect(counter).toEqual(results.length);
        done();
      });
      stream.on('error', err => {
        done(err);
      })
    });
  });
  
  test('writeToDirectory works as expected', () => {
    const dir = 'testDir';
    const name = 'bing';
    const ext = '.bang';
    const data = 'muchmuchdata';

    return moduleLoad.writeToDirectory(dir, [{
      output: { name, ext, data }
    }]).then(results => {
      expect(results).toBeDefined();
      expect(results[0]).toBeDefined();

      const result = results[0];
      expect(result.path).toEqual(path.join(dir, `${name}${ext}`));
      expect(result.data).toEqual(data);
    });
  });  
});
