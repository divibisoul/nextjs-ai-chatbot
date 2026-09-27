import { strict as assert } from 'node:assert';
import test from 'node:test';
import { createRequest } from './adapter';
import { verifySoulMeshMessage, signSoulMeshMessage, createSoulMeshNonce, signSoulMeshResponse, verifySoulMeshResponse } from './SoulMeshHmac';

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
