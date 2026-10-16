import assert from 'node:assert/strict';
import test from 'node:test';
import { createHmac } from 'node:crypto';
import { signSoulMeshResponse } from './SoulMeshHmac';
import type { SoulMeshMessage } from './SoulMeshProtocol';

const secret = '01234567890123456789012345678901';
const canonicalRequest = (message: SoulMeshMessage, nonce: string) => JSON.stringify({
  protocol: message.protocol,
  contractVersion: message.contractVersion,
  id: message.id,
  correlationId: message.correlationId,
  source: message.source,
  target: message.target,
  kind: message.kind,
  capability: message.capability ?? null,
  payload: message.payload,
  timestamp: message.timestamp,
  transport: message.meta?.transport,
  meta: message.meta ?? null,
  nonce,
});

test('N05 peer client signs the N07 canonical request and verifies the signed response', async () => {
  const previousURL = process.env.SOUL_MESH_N01_URL;
  const previousSecret = process.env.SOUL_MESH_HMAC_SECRET;
  const previousFetch = globalThis.fetch;
  process.env.SOUL_MESH_N01_URL = 'http://n01.test/api/soul-mesh';
  process.env.SOUL_MESH_HMAC_SECRET = secret;
  const peer = await import('./peer-client');

  globalThis.fetch = async (_input, init) => {
    const request = JSON.parse(String(init?.body)) as SoulMeshMessage;
    const headers = new Headers(init?.headers);
    const nonce = String(headers.get('x-soul-mesh-nonce'));
    assert.equal(headers.get('x-soul-mesh-hmac'), createHmac('sha256', secret).update(canonicalRequest(request, nonce)).digest('hex'));
    const signed = signSoulMeshResponse(request, { ok: true }, 'response', secret);
    return new Response(JSON.stringify({ ...signed.message, nonce: signed.nonce, hmac: signed.hmac }), {
      status: 200, headers: { 'content-type': 'application/json' },
    });
  };
  try {
    const response = await peer.sendTo('N01', 'mesh.ping', { probe: 'n05-canonical' });
    assert.equal(response.source, 'N01');
    assert.equal(response.target, 'N05');
    assert.deepEqual(response.payload, { ok: true });
  } finally {
    globalThis.fetch = previousFetch;
    if (previousURL === undefined) delete process.env.SOUL_MESH_N01_URL;
    else process.env.SOUL_MESH_N01_URL = previousURL;
    if (previousSecret === undefined) delete process.env.SOUL_MESH_HMAC_SECRET;
    else process.env.SOUL_MESH_HMAC_SECRET = previousSecret;
  }
});

test('N05 peer client rejects a tampered response HMAC', async () => {
  const previousURL = process.env.SOUL_MESH_N01_URL;
  const previousSecret = process.env.SOUL_MESH_HMAC_SECRET;
  const previousFetch = globalThis.fetch;
  process.env.SOUL_MESH_N01_URL = 'http://n01.test/api/soul-mesh';
  process.env.SOUL_MESH_HMAC_SECRET = secret;
  const peer = await import('./peer-client');
  globalThis.fetch = async (_input, init) => {
    const request = JSON.parse(String(init?.body)) as SoulMeshMessage;
    const signed = signSoulMeshResponse(request, { ok: true }, 'response', secret);
    return new Response(JSON.stringify({ ...signed.message, nonce: signed.nonce, hmac: '0'.repeat(64) }), {
      status: 200, headers: { 'content-type': 'application/json' },
    });
  };
  try {
    await assert.rejects(() => peer.sendTo('N01', 'mesh.ping', {}), /SOUL_MESH_RESPONSE_HMAC_INVALID/);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousURL === undefined) delete process.env.SOUL_MESH_N01_URL;
    else process.env.SOUL_MESH_N01_URL = previousURL;
    if (previousSecret === undefined) delete process.env.SOUL_MESH_HMAC_SECRET;
    else process.env.SOUL_MESH_HMAC_SECRET = previousSecret;
  }
});
