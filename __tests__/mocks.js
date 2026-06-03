/**
 * Mocks for the test suite.
 */

const defaultMockFiles = [{
  id: '101010',
  name: 'test-file.passthru'
}];
const _mockFiles = [];
export const mockTestChunk = 'myspecialtestchunk';
export const emulateError = new Error('emulateError');

export function mockFs (mock) {
  const mockWriteFile = mock.fn((path, data) => {
    if (data === emulateError.message) {
      return Promise.reject(emulateError);
    }
    return Promise.resolve({
      path,
      data
    });
  });

  mock.module('node:fs/promises', {
    exports: {
      writeFile: mockWriteFile
    }
  });

  return mockWriteFile;
}

export function mockOn (name, cb) {
  if (name === 'data' && this.on.writeError) {
    cb(Buffer.from(emulateError.message));
    return this;
  }

  if (name ==='data' && this.on.skipError) {
    cb(Buffer.from(mockTestChunk));
  } else if (name === 'end' && this.on.skipError) {
    cb();
  } else if (name === 'error' && !this.on.skipError) {
    cb(emulateError);
  }
  return this;
}

function GoogleAuth (...args) {
  if (GoogleAuth.mock) {
    GoogleAuth.mock(args);
  }
}

function driveList () {
  if (driveList.error) {
    return Promise.reject(emulateError);
  }

  return Promise.resolve({
    data: {
      get files() {
        let theFiles = _mockFiles.length > 0 ? _mockFiles : defaultMockFiles;
        if (driveList.filter) {
          theFiles = driveList.filter(theFiles);
        }
        return theFiles;
      }
    }
  });
}

function driveGet () {
  if (driveGet.error) {
    return Promise.reject(emulateError);
  }

  return Promise.resolve({
    data: {
      on: mockOn
    }
  });
}

export const mockGoogleapis = {
  auth: {
    GoogleAuth
  },
  drive: () => ({
    files: {
      export: driveGet,
      get: driveGet,
      list: driveList
    }
  })
};

export function mockExtractTransform (mock) {
  mock.module('@googleapis/drive', {
    exports: mockGoogleapis
  });
}

export function mockFiles (files, filter = null, listError = false, getError = false) {
  _mockFiles.length = 0;

  if (filter) {
    driveList.filter = filter;
  }

  if (listError) {
    driveList.error = listError;
  }

  if (getError) {
    driveGet.error = getError;
  }

  Array.prototype.push.apply(_mockFiles, files);
}

export function unmockFiles () {
  driveList.filter = null;
  driveList.error = false;
  driveGet.error = false;
  _mockFiles.length = 0;
}

export function mockAuth (fn) {
  GoogleAuth.mock = fn;
}

export function unmockAuth () {
  GoogleAuth.mock = null;
}
