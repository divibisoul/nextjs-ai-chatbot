import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createSoulMeshMessage,
  isSoulMeshMessage,
  SOUL_MESH_CONTRACT_VERSION as canonicalVersion,
  SOUL_MESH_PROTOCOL as canonicalProtocol,
  SOUL_NUCLEI,
} from './SoulMeshProtocol';
import {
  NUCLEUS_ID,
  SOUL_MESH_CONTRACT_VERSION,
  SOUL_MESH_PROTOCOL,
  SOUL_NUCLEI as endpointNuclei,
  validateMeshMessage,
} from './endpoint';

test('N05 endpoint re-exports the canonical Mesh protocol contract', () => {
  assert.equal(SOUL_MESH_PROTOCOL, canonicalProtocol);
  assert.equal(SOUL_MESH_CONTRACT_VERSION, canonicalVersion);
  assert.equal(NUCLEUS_ID, 'N05');
  assert.equal(endpointNuclei, SOUL_NUCLEI);
});

test('N05 endpoint accepts a canonical request and preserves its target policy', () => {
  const message = createSoulMeshMessage({
    correlationId: 'n05-canonical-contract-test',
    source: 'N01',
    target: 'N05',
    kind: 'request',
    capability: 'mesh.ping',
    payload: { probe: true },
  });

  assert.equal(isSoulMeshMessage(message), true);
  assert.equal(validateMeshMessage(message), true);
  assert.throws(
    () => validateMeshMessage({ ...message, target: 'N04' }),
    /WRONG_TARGET/,
  );
});

test('N05 endpoint delegates schema bounds to the canonical validator', () => {
  const message = createSoulMeshMessage({
    correlationId: 'x'.repeat(201),
    source: 'N01',
    target: 'N05',
    kind: 'request',
    capability: 'mesh.ping',
    payload: {},
  });

  assert.equal(isSoulMeshMessage(message), false);
  assert.throws(
    () => validateMeshMessage(message),
    /INVALID_CANONICAL_MESH_MESSAGE/,
  );
});
