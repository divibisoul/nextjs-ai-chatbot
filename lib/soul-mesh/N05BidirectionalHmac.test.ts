import { strict as assert } from 'node:assert';
import { createHmac } from 'node:crypto';
import test from 'node:test';
import { createRequest, sendToNucleus } from './adapter';
import { verifySoulMeshMessage, signSoulMeshMessage, createSoulMeshNonce, signSoulMeshResponse, verifySoulMeshResponse, signCanonicalSoulMeshResponse, verifyCanonicalSoulMeshResponse } from './SoulMeshHmac';
import { verifyN05RequestSignature } from './N05RequestAuthentication';
import { signN07MeshRequest } from './N07MeshHmacCompatibility';

const secret = '0123456789abcdef0123456789abcdef';


test('N05 production inbound authorization rejects Bearer-only requests even with a legacy secret configured', () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousHmac = process.env.SOUL_MESH_HMAC_SECRET;
  const previousSigning = process.env.SOUL_MESH_SIGNING_SECRET;
  const previousToken = process.env.SOUL_MESH_TOKEN;
  process.env.NODE_ENV = 'production';
  delete process.env.SOUL_MESH_HMAC_SECRET;
  process.env.SOUL_MESH_SIGNING_SECRET = 'legacy-signing-secret-configured';
  process.env.SOUL_MESH_TOKEN = 'valid-bearer-token';
  try {
    const message = createRequest('N06', 'mesh.ping', { probe: 'unsigned-production-must-fail' });
    const incoming = new Request('http://127.0.0.1/api/soul-mesh', {
      method: 'POST',
      headers: { authorization: 'Bearer valid-bearer-token' },
    });
    assert.equal(verifyN05RequestSignature(JSON.stringify(message), incoming, message), false);
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
    if (previousHmac === undefined) delete process.env.SOUL_MESH_HMAC_SECRET;
    else process.env.SOUL_MESH_HMAC_SECRET = previousHmac;
    if (previousSigning === undefined) delete process.env.SOUL_MESH_SIGNING_SECRET;
    else process.env.SOUL_MESH_SIGNING_SECRET = previousSigning;
    if (previousToken === undefined) delete process.env.SOUL_MESH_TOKEN;
    else process.env.SOUL_MESH_TOKEN = previousToken;
  }
});

test('N05 production accepts a correctly signed HMAC request without a legacy signature', () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousHmac = process.env.SOUL_MESH_HMAC_SECRET;
  const previousSigning = process.env.SOUL_MESH_SIGNING_SECRET;
  process.env.NODE_ENV = 'production';
  process.env.SOUL_MESH_HMAC_SECRET = secret;
  delete process.env.SOUL_MESH_SIGNING_SECRET;
  const message = createRequest('N06', 'mesh.ping', { probe: 'signed-production' });
  const nonce = createSoulMeshNonce();
  message.nonce = nonce;
  message.meta = { ...(message.meta ?? {}), nonce };
  const signature = signSoulMeshMessage(message, secret, nonce);
  try {
    const incoming = new Request('http://127.0.0.1/api/soul-mesh', {
      method: 'POST',
      headers: { 'x-soul-mesh-nonce': nonce, 'x-soul-mesh-hmac': signature },
    });
    assert.equal(verifyN05RequestSignature(JSON.stringify(message), incoming, message), true);
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
    if (previousHmac === undefined) delete process.env.SOUL_MESH_HMAC_SECRET;
    else process.env.SOUL_MESH_HMAC_SECRET = previousHmac;
    if (previousSigning === undefined) delete process.env.SOUL_MESH_SIGNING_SECRET;
    else process.env.SOUL_MESH_SIGNING_SECRET = previousSigning;
  }
});

test('N05 production peer client refuses missing HMAC before network I/O', async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousHmac = process.env.SOUL_MESH_HMAC_SECRET;
  const previousSigning = process.env.SOUL_MESH_SIGNING_SECRET;
  const previousToken = process.env.SOUL_MESH_TOKEN;
  const previousURL = process.env.SOUL_MESH_N01_URL;
  const previousFetch = globalThis.fetch;
  let networkCalls = 0;
  process.env.NODE_ENV = 'production';
  delete process.env.SOUL_MESH_HMAC_SECRET;
  process.env.SOUL_MESH_SIGNING_SECRET = 'legacy-signing-secret-configured';
  process.env.SOUL_MESH_TOKEN = 'valid-bearer-token';
  process.env.SOUL_MESH_N01_URL = 'http://n01.test/api/soul-mesh';
  globalThis.fetch = async () => { networkCalls += 1; return new Response('{}', { status: 200 }); };
  try {
    await assert.rejects(
      sendToNucleus('N01', 'mesh.ping', { probe: 'missing-hmac' }),
      /MESH_HMAC_NOT_CONFIGURED:N01/,
    );
    assert.equal(networkCalls, 0);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
    if (previousHmac === undefined) delete process.env.SOUL_MESH_HMAC_SECRET;
    else process.env.SOUL_MESH_HMAC_SECRET = previousHmac;
    if (previousSigning === undefined) delete process.env.SOUL_MESH_SIGNING_SECRET;
    else process.env.SOUL_MESH_SIGNING_SECRET = previousSigning;
    if (previousToken === undefined) delete process.env.SOUL_MESH_TOKEN;
    else process.env.SOUL_MESH_TOKEN = previousToken;
    if (previousURL === undefined) delete process.env.SOUL_MESH_N01_URL;
    else process.env.SOUL_MESH_N01_URL = previousURL;
  }
});


test('N05 N07 HMAC signer matches Go field order and lexically sorted nested map keys', () => {
  const message = createRequest('N07', 'mesh.ping', {
    nested: { '10': 'ten', '2': 'two' },
    probe: true,
  });
  const nonce = 'n05-n07-independent-vector';
  message.nonce = nonce;
  message.meta = { ...(message.meta ?? {}), nonce };
  const expectedCanonical =
    '{"protocol":"soul-mesh/1","contractVersion":"1.1.0","id":' + JSON.stringify(message.id) +
    ',"correlationId":' + JSON.stringify(message.correlationId) +
    ',"source":"N05","target":"N07","kind":"request","capability":"mesh.ping",' +
    '"payload":{"nested":{"10":"ten","2":"two"},"probe":true},' +
    '"timestamp":' + String(message.timestamp) +
    ',"transport":"HTTP","meta":{"encoding":"json","nonce":"n05-n07-independent-vector",' +
    '"runtime":"nextjs-ai-chatbot","traceId":' + JSON.stringify(message.id) +
    ',"transport":"HTTP","version":"1.1.0"},"nonce":"n05-n07-independent-vector"}';
  const expected = createHmac('sha256', secret).update(expectedCanonical, 'utf8').digest('hex');
  assert.equal(signN07MeshRequest(message, nonce, secret), expected);
});

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
