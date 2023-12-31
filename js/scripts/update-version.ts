// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// This script update source file "version.ts" under the following folders:
// /js/${arg0}/lib/version.ts
//
// version data is read from file /js/${arg0}/package.json

import fs from 'fs-extra';
import path from 'path';

const packageName = process.argv[2];
if (['common', 'web', 'node', 'react_native'].indexOf(packageName) === -1) {
  throw new Error('expect arg0 to be one of: common,web,node,react_native');
}

const PACKAGE_JSON_FILE = path.join(__dirname, '..', packageName, 'package.json');
const version = JSON.parse(fs.readFileSync(PACKAGE_JSON_FILE).toString()).version;

if (typeof version !== 'string') {
  throw new Error(`failed to parse "version" from file: ${PACKAGE_JSON_FILE}`);
}

const FILE_CONTENT = `// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// This file is generated by /js/scripts/update-version.ts
// Do not modify file content manually.

export const version = ${JSON.stringify(version)};
`;

fs.writeFileSync(path.join(__dirname, '..', packageName, 'lib', 'version.ts'), FILE_CONTENT);
