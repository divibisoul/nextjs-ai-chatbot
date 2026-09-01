import test from 'node:test';
import assert from 'node:assert/strict';
import { N05MeshGateway } from './N05MeshGateway';

const CONTRACT_VERSION = '1.1.0' as const;

test('N05 owns inference and accepts an authorized N01 request', async () => {
  const gateway = new N05MeshGateway();
  gateway.register('inference.reason', async request => ({ ok: true, source: request.source, payload: request.payload }), {
    owner: 'N05', consumers: ['N01'],
  });
  const response = await gateway.execute({ source: 'N01', target: 'N05', contractVersion: CONTRACT_VERSION, capability: 'inference.reason', payload: 'test', timestamp: Date.now(), nonce: 'gateway-test-nonce' });
  assert.equal(response.status, 'ok');
  assert.equal(response.contractVersion, CONTRACT_VERSION);
  assert.equal(response.source, 'N05');
  assert.equal(response.target, 'N01');
  assert.equal(response.capability, 'inference.reason');
  assert.equal(response.correlationId.length > 0, true);
});

test('N05 rejects a replayed nonce', async () => {
  const gateway = new N05MeshGateway();
  gateway.register('inference.reason', () => 'ok', { owner: 'N05', consumers: ['N01'] });
  const request = { source: 'N01' as const, target: 'N05' as const, contractVersion: CONTRACT_VERSION, capability: 'inference.reason', payload: 'test', timestamp: Date.now(), nonce: 'replay-test' };
  const first = await gateway.execute(request);
  const second = await gateway.execute(request);
  assert.equal(first.status, 'ok');
  assert.equal(first.contractVersion, CONTRACT_VERSION);
  assert.equal(second.status, 'error');
  assert.equal(second.error?.code, 'MESH_SECURITY_REJECTED');
  assert.equal(second.contractVersion, CONTRACT_VERSION);
});
