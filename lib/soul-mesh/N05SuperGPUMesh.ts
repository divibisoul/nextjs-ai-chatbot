import { requestPeerCapability } from './peer-client';

export const N05_SUPERGPU_MESH_CAPABILITY = 'mesh.supergpu.execute@1.0.0' as const;

export async function requestN07SuperGPU(values: number[], operation = 'identity', device?: string, timeoutMs = 15_000) {
  if (!Array.isArray(values) || values.length === 0 || values.some(value => !Number.isFinite(value))) {
    throw new Error('SUPERGPU_VALUES_INVALID');
  }
  if (!operation.trim()) throw new Error('SUPERGPU_OPERATION_REQUIRED');
  return requestPeerCapability('N07', N05_SUPERGPU_MESH_CAPABILITY, {
    values,
    metadata: { operation, ...(device?.trim() ? { device: device.trim() } : {}) },
  }, timeoutMs);
}
