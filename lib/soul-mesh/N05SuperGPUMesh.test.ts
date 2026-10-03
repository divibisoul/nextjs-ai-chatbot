import test from 'node:test';
import assert from 'node:assert/strict';
import { requestN07SuperGPU } from './N05SuperGPUMesh';

test('N05 SuperGPU Mesh client fails closed on invalid values', async () => {
  await assert.rejects(requestN07SuperGPU([Number.NaN]), /SUPERGPU_VALUES_INVALID/);
});

test('N05 SuperGPU Mesh client fails closed on empty operation', async () => {
  await assert.rejects(requestN07SuperGPU([1], ''), /SUPERGPU_OPERATION_REQUIRED/);
});
