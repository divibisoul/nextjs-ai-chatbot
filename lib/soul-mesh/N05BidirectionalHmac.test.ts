import { strict as assert } from 'node:assert';
import test from 'node:test';
import { createRequest } from './adapter';
import { verifySoulMeshMessage, signSoulMeshMessage, createSoulMeshNonce, verifySoulMeshResponse } from './SoulMeshHmac';

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
  const nonce = createSoulMeshNonce();
  const response = {
    protocol: 'soul-mesh/1' as const,
    contractVersion: '1.1.0' as const,
    id: 'resp-1',
    correlationId: request.correlationId,
    source: 'N07' as const,
    target: 'N05' as const,
    kind: 'response' as const,
    capability: request.capability,
    payload: { text: 'pong' },
    timestamp: Date.now(),
    nonce,
    meta: { runtime: 'n07', transport: 'HTTP', encoding: 'json', version: '1.1.0', nonce, traceId: request.correlationId },
  };
  const hmac = signSoulMeshMessage(response, secret, nonce);
  assert.equal(verifySoulMeshResponse(request, response, secret, nonce, hmac), true);
  assert.equal(verifySoulMeshResponse(request, { ...response, target: 'N04' }, secret, nonce, hmac), false);
});
