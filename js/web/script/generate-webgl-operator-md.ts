// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as assert from 'assert';
import * as fs from 'fs';
import {EOL} from 'os';
import * as path from 'path';

import {Attribute} from '../lib/onnxjs/attribute';
import {WEBGL_OP_RESOLVE_RULES} from '../lib/onnxjs/backends/webgl/op-resolve-rules';
import {OpSet, resolveOperator} from '../lib/onnxjs/opset';
import {Tensor} from '../lib/onnxjs/tensor';

function checkSupport(type: string, range: [number, number], rules: readonly OpSet.ResolveRule[]) {
  const node = {name: '', opType: type, inputs: [], outputs: [], attributes: new Attribute(undefined)};
  for (let i = range[0]; i <= range[1]; i++) {
    try {
      resolveOperator(node, [{domain: '', version: i}], rules);
    } catch (_e) {
      return false;
    }
  }
  return true;
}

function formatDesc(opType: string, range: [number, number], support: boolean, last: boolean) {
  let versionDesc = '';
  if (support) {
    versionDesc = last ? `${range[0]}+` : range[0] === range[1] ? `${range[0]}` : `${range[0]}-${range[1]}`;
    versionDesc = `[${versionDesc}](https://github.com/onnx/onnx/blob/main/docs/Changelog.md#${opType}-${range[0]})`;
  }
  return versionDesc;
}
function dummyOpImpl(): Tensor[] {
  return {} as any as Tensor[];
}

const ops = new Map<string, Map<string, number[]>>();
const webglCheckOnlyRules =
    WEBGL_OP_RESOLVE_RULES.map(rule => [rule[0], rule[1], rule[2], dummyOpImpl] as OpSet.ResolveRule);

fs.readFileSync(path.join(__dirname, '../../../cmake/external/onnx/onnx/defs/operator_sets.h'), 'utf8')
    .split(/\r?\n/)
    .forEach(line => {
      const matcher = /class ONNX_OPERATOR_SET_SCHEMA_CLASS_NAME\(\s*(\w+),\s*(\d+),\s*(\w+)\)/;
      const matches = matcher.exec(line);
      if (matches) {
        const opset = matches[1];
        const version = Number.parseInt(matches[2], 10);
        const opType = matches[3];

        let currentSet = ops.get(opset);
        if (currentSet === undefined) {
          currentSet = new Map<string, number[]>();
          ops.set(opset, currentSet);
        }

        let currentOp = currentSet.get(opType);
        if (currentOp === undefined) {
          currentOp = [];
          currentSet.set(opType, currentOp);
        }

        currentOp.push(version);
      }
    });

const opsets = Array.from(ops.keys());
assert.ok(opsets.length === 1 && opsets[0] === 'Onnx');

const onnxOpset = ops.get(opsets[0])!;
const opTypes = Array.from(onnxOpset.keys()).sort();

const doc = fs.createWriteStream(path.join(__dirname, '../docs/webgl-operators.md'));
doc.write(`## Operators Support Table${EOL}${EOL}`);
doc.write(`The following table shows [ai.onnx](https://github.com/onnx/onnx/blob/main/docs/Operators.md)\
  operators from which onnx opset version are currently supported by ONNX Runtime Web. For example, \`4-6, 8+\` means\
  ONNX Runtime Web currently support opset version 4 to 6, 8 and above.${EOL}${EOL}`);
doc.write(`See [Compatibility](../README.md#Compatibility) for a list of the supported platforms.${EOL}${EOL}`);
doc.write(`*This file is automatically generated from the\
  def files via [this script](../script/generate-operator-md.ts).\
  Do not modify directly.*${EOL}${EOL}`);
doc.write(`| Operator | WebGl Backend |${EOL}`);
doc.write(`|:--------:|:-------------:|${EOL}`);

let VERSION_MAX = 0;
onnxOpset.forEach(versions => {
  versions.forEach(version => VERSION_MAX = Math.max(VERSION_MAX, version));
});

for (const type of opTypes) {
  const versions = onnxOpset.get(type)!.sort((a, b) => a - b);

  const webgl: string[] = [];
  for (let i = 0; i < versions.length; i++) {
    const last = i === versions.length - 1;
    const versionRange: [number, number] = [versions[i], last ? VERSION_MAX : versions[i + 1] - 1];

    webgl.push(formatDesc(type, versionRange, checkSupport(type, versionRange, webglCheckOnlyRules), last));
  }

  doc.write(`| [${type}](https://github.com/onnx/onnx/blob/main/docs/Operators.md#${type}) | ${
      webgl.filter(d => d.length > 0).join(', ')} |${EOL}`);
}
doc.end();
