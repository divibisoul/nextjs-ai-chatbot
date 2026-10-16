import assert from 'node:assert/strict';
import test from 'node:test';
import { createHmac } from 'node:crypto';
import { signCanonicalSoulMeshResponse } from './SoulMeshHmac';
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
  const previousToken = process.env.SOUL_MESH_TOKEN;
  const previousFetch = globalThis.fetch;
  process.env.SOUL_MESH_N01_URL = 'http://n01.test/api/soul-mesh';
  process.env.SOUL_MESH_HMAC_SECRET = secret;
  process.env.SOUL_MESH_TOKEN = 'n05-peer-client-bearer-token';
  const peer = await import('./peer-client');

  globalThis.fetch = async (_input, init) => {
    const request = JSON.parse(String(init?.body)) as SoulMeshMessage;
    const headers = new Headers(init?.headers);
    assert.equal(headers.get('authorization'), 'Bearer n05-peer-client-bearer-token');
    const nonce = String(headers.get('x-soul-mesh-nonce'));
    assert.equal(headers.get('x-soul-mesh-hmac'), createHmac('sha256', secret).update(canonicalRequest(request, nonce)).digest('hex'));
    const signed = signCanonicalSoulMeshResponse(request, { ok: true }, 'response', secret);
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
    if (previousToken === undefined) delete process.env.SOUL_MESH_TOKEN;
    else process.env.SOUL_MESH_TOKEN = previousToken;
  }
});

test('N05 peer client rejects a tampered response HMAC', async () => {
  const previousURL = process.env.SOUL_MESH_N01_URL;
  const previousSecret = process.env.SOUL_MESH_HMAC_SECRET;
  const previousFetch = globalThis.fetch;
  let calls = 0;
  process.env.SOUL_MESH_N01_URL = 'http://n01.test/api/soul-mesh';
  process.env.SOUL_MESH_HMAC_SECRET = secret;
  const peer = await import('./peer-client');
  globalThis.fetch = async (_input, init) => {
    calls += 1;
    const request = JSON.parse(String(init?.body)) as SoulMeshMessage;
    const signed = signCanonicalSoulMeshResponse(request, { ok: true }, 'response', secret);
    return new Response(JSON.stringify({ ...signed.message, nonce: signed.nonce, hmac: '0'.repeat(64) }), {
      status: 200, headers: { 'content-type': 'application/json' },
    });
  };
  try {
    await assert.rejects(() => peer.sendTo('N01', 'mesh.ping', {}), /SOUL_MESH_RESPONSE_HMAC_INVALID/);
    assert.equal(calls, 1, 'an authentication failure must not be retried');
  } finally {
    globalThis.fetch = previousFetch;
    if (previousURL === undefined) delete process.env.SOUL_MESH_N01_URL;
    else process.env.SOUL_MESH_N01_URL = previousURL;
    if (previousSecret === undefined) delete process.env.SOUL_MESH_HMAC_SECRET;
    else process.env.SOUL_MESH_HMAC_SECRET = previousSecret;
  }
});


test('N05 peer client rejects an unsigned HTTP error before consulting status policy', async () => {
  const previousURL = process.env.SOUL_MESH_N01_URL;
  const previousSecret = process.env.SOUL_MESH_HMAC_SECRET;
  const previousFetch = globalThis.fetch;
  process.env.SOUL_MESH_N01_URL = 'http://n01.test/api/soul-mesh';
  process.env.SOUL_MESH_HMAC_SECRET = secret;
  const peer = await import('./peer-client');
  globalThis.fetch = async (_input, init) => {
    const request = JSON.parse(String(init?.body)) as SoulMeshMessage;
    const signed = signCanonicalSoulMeshResponse(request, { code: 'remote-failure' }, 'error', secret);
    return new Response(JSON.stringify({ ...signed.message, hmac: '0'.repeat(64) }), {
      status: 400, headers: { 'content-type': 'application/json' },
    });
  };
  try {
    await assert.rejects(() => peer.sendTo('N01', 'mesh.ping', {}, 2000), /SOUL_MESH_RESPONSE_HMAC_INVALID/);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousURL === undefined) delete process.env.SOUL_MESH_N01_URL;
    else process.env.SOUL_MESH_N01_URL = previousURL;
    if (previousSecret === undefined) delete process.env.SOUL_MESH_HMAC_SECRET;
    else process.env.SOUL_MESH_HMAC_SECRET = previousSecret;
  }
});

test('N05 peer client reports a correctly authenticated HTTP error only after verification', async () => {
  const previousURL = process.env.SOUL_MESH_N01_URL;
  const previousSecret = process.env.SOUL_MESH_HMAC_SECRET;
  const previousFetch = globalThis.fetch;
  process.env.SOUL_MESH_N01_URL = 'http://n01.test/api/soul-mesh';
  process.env.SOUL_MESH_HMAC_SECRET = secret;
  const peer = await import('./peer-client');
  globalThis.fetch = async (_input, init) => {
    const request = JSON.parse(String(init?.body)) as SoulMeshMessage;
    const signed = signCanonicalSoulMeshResponse(request, { code: 'remote-failure' }, 'error', secret);
    return new Response(JSON.stringify(signed.message), {
      status: 400, headers: { 'content-type': 'application/json' },
    });
  };
  try {
    await assert.rejects(() => peer.sendTo('N01', 'mesh.ping', {}, 2000), /SOUL_MESH_REMOTE_ERROR:N01:400/);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousURL === undefined) delete process.env.SOUL_MESH_N01_URL;
    else process.env.SOUL_MESH_N01_URL = previousURL;
    if (previousSecret === undefined) delete process.env.SOUL_MESH_HMAC_SECRET;
    else process.env.SOUL_MESH_HMAC_SECRET = previousSecret;
  }
});


test('N05 peer client refuses Bearer-only production requests before network I/O', async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousSecret = process.env.SOUL_MESH_HMAC_SECRET;
  const previousToken = process.env.SOUL_MESH_TOKEN;
  const previousURL = process.env.SOUL_MESH_N01_URL;
  const previousFetch = globalThis.fetch;
  let calls = 0;
  process.env.NODE_ENV = 'production';
  delete process.env.SOUL_MESH_HMAC_SECRET;
  process.env.SOUL_MESH_TOKEN = 'valid-bearer-without-hmac';
  process.env.SOUL_MESH_N01_URL = 'http://n01.test/api/soul-mesh';
  const peer = await import('./peer-client');
  globalThis.fetch = async () => { calls += 1; return new Response('{}', { status: 200 }); };
  try {
    await assert.rejects(
      peer.sendTo('N01', 'mesh.ping', {}),
      /SOUL_MESH_HMAC_NOT_CONFIGURED:N01/,
    );
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
    if (previousSecret === undefined) delete process.env.SOUL_MESH_HMAC_SECRET;
    else process.env.SOUL_MESH_HMAC_SECRET = previousSecret;
    if (previousToken === undefined) delete process.env.SOUL_MESH_TOKEN;
    else process.env.SOUL_MESH_TOKEN = previousToken;
    if (previousURL === undefined) delete process.env.SOUL_MESH_N01_URL;
    else process.env.SOUL_MESH_N01_URL = previousURL;
  }
});

test('N05 peer client does not retry executable capabilities', async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousSecret = process.env.SOUL_MESH_HMAC_SECRET;
  const previousToken = process.env.SOUL_MESH_TOKEN;
  const previousFetch = globalThis.fetch;
  let calls = 0;
  process.env.NODE_ENV = 'test';
  process.env.SOUL_MESH_HMAC_SECRET = secret;
  process.env.SOUL_MESH_TOKEN = 'n05-peer-client-bearer-token';
  const peer = await import('./peer-client');
  globalThis.fetch = async () => { calls += 1; throw new TypeError('deliberate transport failure for idempotency test'); };
  try {
    await assert.rejects(peer.sendTo('N01', 'ai.infer', { prompt: 'do not duplicate' }, 2000, 3), /deliberate transport failure/);
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
    if (previousSecret === undefined) delete process.env.SOUL_MESH_HMAC_SECRET;
    else process.env.SOUL_MESH_HMAC_SECRET = previousSecret;
    if (previousToken === undefined) delete process.env.SOUL_MESH_TOKEN;
    else process.env.SOUL_MESH_TOKEN = previousToken;
  }
});
