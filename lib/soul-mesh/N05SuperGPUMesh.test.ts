import { describe, expect, it } from 'vitest';
import { requestN07SuperGPU } from './N05SuperGPUMesh';

describe('N05 SuperGPU Mesh client', () => {
  it('fails closed on non-finite input', async () => {
    await expect(requestN07SuperGPU([Number.NaN])).rejects.toThrow('SUPERGPU_VALUES_INVALID');
  });
  it('fails closed on empty operation', async () => {
    await expect(requestN07SuperGPU([1], '')).rejects.toThrow('SUPERGPU_OPERATION_REQUIRED');
  });
});
