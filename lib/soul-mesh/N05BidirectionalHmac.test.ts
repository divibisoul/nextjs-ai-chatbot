import { strict as assert } from 'node:assert';
import test from 'node:test';
import { createRequest } from './adapter';
import { verifySoulMeshMessage, signSoulMeshMessage, createSoulMeshNonce, signSoulMeshResponse, verifySoulMeshResponse, signCanonicalSoulMeshResponse, verifyCanonicalSoulMeshResponse } from './SoulMeshHmac';

const secret = '0123456789abcdef0123456789abcdef';

test('N05 request nonce is canonical at envelope and meta levels', () => {
  const request = createRequest('N07', 'ai.generate', { text: 'ping' });
  const nonce = createSoulMeshNonce();
  request.nonce = nonce;
  request.meta = { ...(request.meta ?? {}), nonce };
  const signature = signSoulMeshMessage(request, secret, nonce);
  assert.equal(verifySoulMeshMessage({ ...request, hmac: signature }, secret, nonce, signature), true);
});

test('N05 response HMAC enforces route and correlation', () => {
  const request = createRequest('N07', 'ai.generate', { text: 'ping' });
  const signed = signSoulMeshResponse(request, { text: 'pong' }, 'response', secret);
  const response = { ...signed.message, nonce: signed.nonce, hmac: signed.hmac };
  assert.equal(verifySoulMeshResponse(request, response, secret, signed.nonce, signed.hmac), true);
  assert.equal(verifySoulMeshResponse(request, { ...response, target: 'N04' }, secret, signed.nonce, signed.hmac), false);
});

test('N05 rejects an HMAC key below the 32-byte Mesh minimum', () => {
  const message = createRequest('N07', 'ai.generate', { text: 'ping' });
  assert.throws(
    () => signSoulMeshMessage(message, 'short-n05-secret', createSoulMeshNonce()),
    /SOUL_MESH_HMAC_SECRET_TOO_SHORT/,
  );
  assert.equal(
    verifySoulMeshMessage(message, 'short-n05-secret', createSoulMeshNonce(), '0'.repeat(64)),
    false,
  );
});


test('N05 canonical response envelope is compatible with N06 and preserves route/correlation checks', () => {
  const request = createRequest('N06', 'mesh.ping', { probe: 'n05-n06-canonical' });
  const signed = signCanonicalSoulMeshResponse(request, { ok: true, nucleus: 'N06' }, 'response', secret);
  assert.equal(verifyCanonicalSoulMeshResponse(request, signed.message, secret), true);
  assert.equal(verifyCanonicalSoulMeshResponse(request, { ...signed.message, source: 'N04' }, secret), false);
  assert.equal(verifyCanonicalSoulMeshResponse(request, { ...signed.message, correlationId: 'different' }, secret), false);
  assert.equal(verifySoulMeshResponse(request, signed.message, secret, signed.nonce, signed.hmac), false);
});

test('N05 retains the distinct N07 legacy response signature contract', () => {
  const request = createRequest('N07', 'mesh.ping', { probe: 'n05-n07-legacy' });
  const signed = signSoulMeshResponse(request, { ok: true, nucleus: 'N07' }, 'response', secret);
  const response = { ...signed.message, nonce: signed.nonce, hmac: signed.hmac };
  assert.equal(verifySoulMeshResponse(request, response, secret, signed.nonce, signed.hmac), true);
});
