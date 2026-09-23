import assert from 'node:assert/strict';
import test from 'node:test';
import { POST } from './route';

function message(capability: string, payload: unknown) {
  return new Request('http://localhost/api/soul-mesh', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      protocol: 'soul-mesh/1',
      contractVersion: '1.1.0',
      id: crypto.randomUUID(),
      correlationId: crypto.randomUUID(),
      source: 'N07',
      target: 'N05',
      kind: 'request',
      capability: 'octacore.execute',
      payload: { capability, payload, job_id: 'g5-cert-job' },
      timestamp: Date.now(),
    }),
  });
}

test('G5 Octacore wrapper executes canonical Mesh ping kernel', async () => {
  process.env.NODE_ENV = 'test';
  const response = await POST(message('mesh.ping', { certification: true }));
  assert.equal(response.status, 200);
  const body = await response.json() as any;
  assert.equal(body.kind, 'response');
  assert.equal(body.payload.kernel, 'G5');
  assert.equal(body.payload.value.ok, true);
  assert.equal(body.payload.value.nucleus, 'N05');
});

test('G5 Octacore wrapper preserves explicit capability failure', async () => {
  process.env.NODE_ENV = 'test';
  const response = await POST(message('does.not.exist', {}));
  assert.equal(response.status, 501);
  const body = await response.json() as any;
  assert.equal(body.kind, 'error');
  assert.equal(body.payload.code, 'OCTACORE_N05_CAPABILITY_NOT_EXECUTABLE');
});
