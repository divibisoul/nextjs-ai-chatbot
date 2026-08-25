import assert from 'node:assert/strict';
import test from 'node:test';
import { SoulMeshFullMesh } from './SoulMeshFullMesh';
import { SOUL_MESH_NUCLEI } from './SoulMeshTopology';

test('six nuclei expose exactly five peers each', () => {
  const mesh = new SoulMeshFullMesh();
  assert.equal(mesh.directedConnections, 30);
  for (const nucleus of SOUL_MESH_NUCLEI) assert.equal(mesh.peers(nucleus).length, 5);
});

test('all 30 directed routes deliver messages to their target', async () => {
  const mesh = new SoulMeshFullMesh();
  const result = await mesh.probeAll();
  assert.equal(result.sent, 30);
  assert.equal(result.delivered, 30);
});

test('a nucleus cannot impersonate another nucleus', async () => {
  const mesh = new SoulMeshFullMesh();
  await assert.rejects(() => mesh.transport('aeternum').send({
    protocol: 'soul-mesh/1', id: crypto.randomUUID(), correlationId: null,
    source: 'nexus', target: 'aeternum', kind: 'event', payload: null, timestamp: Date.now(),
  }));
});
