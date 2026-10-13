import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SOUL_MESH_CONTRACT_VERSION,
  SOUL_MESH_PROTOCOL,
  validateMeshMessage,
  type SoulMeshMessage,
} from './endpoint';
import {
  SOUL_MESH_CONTRACT_VERSION as CANONICAL_CONTRACT_VERSION,
  SOUL_MESH_PROTOCOL as CANONICAL_PROTOCOL,
} from './SoulMeshProtocol';

function message(overrides: Partial<SoulMeshMessage> = {}): SoulMeshMessage {
  return {
    protocol: SOUL_MESH_PROTOCOL,
    contractVersion: SOUL_MESH_CONTRACT_VERSION,
    id: 'n05-contract-test-message',
    correlationId: 'n05-contract-test-correlation',
    source: 'N01',
    target: 'N05',
    kind: 'request',
    capability: 'mesh.ping',
    payload: { probe: true },
    timestamp: Date.now(),
    ...overrides,
  };
}

test('N05 endpoint re-exports the canonical Mesh protocol and contract version', () => {
  assert.equal(SOUL_MESH_PROTOCOL, CANONICAL_PROTOCOL);
  assert.equal(SOUL_MESH_CONTRACT_VERSION, CANONICAL_CONTRACT_VERSION);
});

test('N05 endpoint accepts a valid canonical request without changing its public boundary', () => {
  assert.equal(validateMeshMessage(message()), true);
});

test('N05 endpoint preserves nucleus routing and N05 target guards', () => {
  assert.throws(() => validateMeshMessage(message({ target: 'N04' })), /WRONG_TARGET/);
  assert.throws(
    () => validateMeshMessage({ ...message(), source: 'N05' } as SoulMeshMessage),
    /INVALID_NUCLEUS_ROUTE/,
  );
  assert.throws(
    () => validateMeshMessage({ ...message(), source: 'N99' } as unknown as SoulMeshMessage),
    /INVALID_NUCLEUS_ROUTE/,
  );
});

test('N05 endpoint rejects unsupported Mesh versions and message kinds', () => {
  assert.throws(
    () => validateMeshMessage({ ...message(), contractVersion: '2.0.0' } as unknown as SoulMeshMessage),
    /UNSUPPORTED_MESH_CONTRACT_VERSION/,
  );
  assert.throws(
    () => validateMeshMessage({ ...message(), kind: 'ack' } as unknown as SoulMeshMessage),
    /INVALID_MESSAGE_KIND/,
  );
});
