# google-drive-folder

> Downloads files from a google drive folder and returns as a stream

[![npm version](https://badge.fury.io/js/%40localnerve%2Fgoogle-drive-folder.svg)](https://badge.fury.io/js/%40localnerve%2Fgoogle-drive-folder)
![Verify](https://github.com/localnerve/google-drive-folder/workflows/Verify/badge.svg)
[![Coverage Status](https://coveralls.io/repos/github/localnerve/google-drive-folder/badge.svg?branch=master)](https://coveralls.io/github/localnerve/google-drive-folder?branch=master)

## Conversions

> Limited to my needs, for now

This library supplies conversions for markdown and json. Files types are detected from file extensions.
All other types are passed through as `text/plain` without conversion.

## Prerequisites

This library relies on Environment variable SVC_ACCT_CREDENTIALS to point to a valid Google service account credential file. Further, this credential must have the permissions to impersonate the user email passed in as `userId`.

## API

The library exports an async `function` that takes two arguments and returns a promise.

 1. Google drive arguments {Object}
 2. Optional options {Object}

```
Promise<Stream> GoogleDriveFolder (GoogleDriveParameters, Options)

  GoogleDriveParameters:
    { folderId: String, userId: String, scopes: Array<String>}
  Options:
    { outputDirectory: String }
```

### Return

The returned Promise resolves to a `Stream` in object mode to receive data objects for each downloaded file as they arrive.

### Stream Data

The format of the data objects you will receive on `data` events:

```
  {
    input: {
      data,     // Raw data from Google Drive
      name,     // String of the file name
      ext       // String of the file extension
    },
    // If converted is true, the converted data. Otherwise, a reference to input
    output: {
      data,     // String (html) or Object (parsed json) or 'text/plain' from google drive
      name,     // String of the file name
      ext       // String of the file extension
    },
    converted   // Boolean, true if conversion occurred, false otherwise
  }
```

The `input` is data as downloaded from Google Drive.
The `output` is data as converted. If no conversion (`converted === false`), it is a referece to `input`.

### Local Directory Output

If you supply the `outputDirectory` option, files are written to the supplied `outputDirectory` as the data comes in.

## Input

**REQUIRED**
* `SVC_ACCT_CREDENTIALS` Environment variable must point to a valid Google Service Account credential file.

### Google Drive Parameters

* `GoogleDriveInfo` {Object} - The google drive information, first argument.
* `GoogleDriveInfo.folderId` {String} -  Uniquely identifies your folder in the google drive service. Found on the web in the url.
* `GoogleDriveInfo.userId` {String} - The email address of the folder owner that SVC_ACCT will impersonate.
* `[GoogleDriveInfo.scopes]` {Array<String>} - Optional scopes to use for auth in a special case. Defaults to `drive.readonly`.

### Optional Options

* `Options` {Object} - Optional options
* `Options.outputDirectory` {String} - Absolute path to the output directory. If supplied, files are written as data arrives.
*    Does not touch the directory other than to write files. Must already exist.

## Example Usage

### Code Example using minimal options

```js
import googleDriveFolder from '@localnerve/google-drive-folder';

process.env.SVC_ACCT_CREDENTIALS = '/path/to/svcacctcredential.json';

const googleDriveInfo = {
  folderId: 'ThEfOlDeRiDyOuSeEiNyOuRbRoWsErOnGoOgLeDrIvE',
  userId: 'email-of-the-folder-owner@will-be-impersonated.by-svc-acct'
}

try {
  // Blocks until object flow begins (while auth and file list is downloaded)
  const stream = await googleDriveFolder(googleDriveInfo);
  stream.on('data', data => {
    console.log(`Received a data object for '${data.input.name}'`, data);
  });
  stream.on('end', () => {
    console.log('downloads are done, we got all the files');
  });
  stream.on('error', e => {
    throw e;
  });
} catch (e) {
  console.error(e); // something went wrong
}
```

### Code Example using all possible options

All the prerequisites and possible arguments as code:

```js
import googleDriveFolder from '@localnerve/google-drive-folder';

process.env.SVC_ACCT_CREDENTIALS = '/path/to/svcacctcredential.json';

const googleDriveInfo = {
  folderId: 'ThEfOlDeRiDyOuSeEiNyOuRbRoWsErOnGoOgLeDrIvE',
  userId: 'email-of-the-folder-owner@will-be-impersonated.by-svc-acct',
  // If scopes omitted, uses https://www.googleapis.com/auth/drive.readonly
  scopes: [
    'special/google.auth/scope/you/might/need/other/than/drive.readonly',
    'https://www.googleapis.com/auth/drive.readonly'
  ]
};
// all optional, if outputDirectory omitted, returns ReadableStream
const options = {
  outputDirectory: '/tmp/mydrivefolder/mustexist'
};

try {
  // Blocks until object flow begins (while auth and file list is downloaded)
  const stream = await googleDriveFolder(googleDriveInfo, options);
  stream.on('data', data => {
    console.log(`Received a data object for '${data.input.name}'`, data);
  });
  stream.on('end', () => {
    console.log('downloads are done, we got all the files');
  });
  stream.on('error', e => {
    throw e;
  });
} catch (e) {
  console.error(e); // something went wrong
}

```

## LICENSE

* [MIT 2021, Alex Grant, LocalNerve, LLC](license.md)
