# google-drive-folder

> Downloads files from a google drive folder and returns as a readable stream or writes to a local directory

[![npm version](https://badge.fury.io/js/%40localnerve%2Fgoogle-drive-folder.svg)](https://badge.fury.io/js/%40localnerve%2Fgoogle-drive-folder)
![Verify](https://github.com/localnerve/google-drive-folder/workflows/Verify/badge.svg)
[![Coverage Status](https://coveralls.io/repos/github/localnerve/google-drive-folder/badge.svg?branch=master)](https://coveralls.io/github/localnerve/google-drive-folder?branch=master)

## Conversions
This library supplies conversions for markdown and json. All other file types are passed through without conversion.

## Prerequisites
This library relies on Environment variable SVC_ACCT_CREDENTIALS to point to a valid Google service account credential file. Further, this credential must have the permissions to impersonate the user email passed in as `userId`.

## API
The library exports an default async `function` that takes two Object arguments:

 1. Google drive arguments
 2. Optional options

```
GoogleDriveFolder (GoogleDriveParameters, Options)
```

As a signature with types:

`({ folderId: String, userId: String, scopes: Array<String>}, { outputDirectory: String, logger: Function })`

### Return
By default, returns a `ReadableStream` in object mode. Can also write to [local directory](#local-directory).
Here is the format of the data objects:

```
  {
    input: {
      data,
      name,
      ext
    },
    output: {
      data,
      name,
      ext
    },
    converted
  }
```

The `input` is data as downloaded from Google Drive.
The `output` is data as converted. If no conversion (`converted === false`), it is a referece to `input`.

#### Local Directory
If you supply the `outputDirectory` option, writes to the directory instead of returning a stream.

## Input Details

### Required input

* `SVC_ACCT_CREDENTIALS` Environment variable must point to a valid Google Service Account credential file.
* `GoogleDriveInfo` {Object} - The google drive information, first argument.
* `GoogleDriveInfo.folderId` {String} -  Uniquely identifies your folder in the google drive service. Found on the web in the url.
* `GoogleDriveInfo.userId` {String} - The email address of the folder owner that SVC_ACCT will impersonate.

### All input

All the prerequisites and possible arguments as code:

```js
import googleDriveFolder from '@localnerve/google-drive-folder';

process.env.SVC_ACCT_CREDENTIALS = '/path/to/svcacctcredential.json';

const googleDriveInfo = {
  folderId: 'ThEfOlDeRiDyOuSeEiNyOuRbRoWsErOnGoOgLeDrIvE',
  userId: 'email-of-the-folder-owner@will-be-impersonated.by-svc-acct',
  // If scopes omitted, https://www.googleapis.com/auth/drive.readonly used by default
  scopes: [
    'special/google.auth/scope/you/might/need/other/than/drive.readonly',
    'https://www.googleapis.com/auth/drive.readonly'
  ]
};
// all optional, if outputDirectory omitted, returns ReadableStream
const options = {
  outputDirectory: '/tmp/mydrivefolder/mustexist',
  logger: console.error
};

await googleDriveFolder(googleDriveInfo, options);
```

## LICENSE

* [MIT 2021, Alex Grant, LocalNerve, LLC](license.md)
