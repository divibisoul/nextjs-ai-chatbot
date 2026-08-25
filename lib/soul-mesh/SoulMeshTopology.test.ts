import assert from 'node:assert/strict';
import test from 'node:test';
import { assertFivePeers, getSoulMeshPeers, SOUL_MESH_NUCLEI } from './SoulMeshTopology';

test('Soul Mesh exposes six nuclei and five peers per nucleus', () => {
  assert.equal(SOUL_MESH_NUCLEI.length, 6);
  for (const nucleus of SOUL_MESH_NUCLEI) {
    const peers = getSoulMeshPeers(nucleus);
    assert.equal(peers.length, 5);
    assert.equal(new Set(peers).size, 5);
    assert.ok(!peers.includes(nucleus));
    assert.doesNotThrow(() => assertFivePeers(nucleus));
  }
});
