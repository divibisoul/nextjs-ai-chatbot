import assert from 'node:assert/strict';
import test from 'node:test';
import {
  n05CooperationExchange,
  n05CooperationHandshake,
} from './N05CooperationBridge';
import { signSoulMeshResponse } from '@/lib/soul-mesh/SoulMeshHmac';

const originalFetch = globalThis.fetch;

test.afterEach(() => {
  globalThis.fetch = originalFetch;
  delete process.env.SOUL_MESH_N07_URL;
  delete process.env.SOUL_MESH_HMAC_SECRET;
});

function installFakeN07() {
  const secret = '0123456789abcdef0123456789abcdef';
  process.env.SOUL_MESH_N07_URL = 'http://n07.test';
  process.env.SOUL_MESH_HMAC_SECRET = secret;
  let last: any;
  globalThis.fetch = async (_input: any, init?: any) => {
    last = JSON.parse(String(init?.body ?? '{}'));
    const signed = signSoulMeshResponse(
      last,
      { accepted: true, target: last.payload.target, capability: last.payload.capability ?? null },
      'response',
      secret,
    );
    return new Response(JSON.stringify({
      ...signed.message,
      nonce: signed.nonce,
      hmac: signed.hmac,
    }), { status: 200 });
  };
  return () => last;
}

test('N05 handshake delegates through existing Mesh bridge with same correlation', async () => {
  const body = installFakeN07();
  const result: any = await n05CooperationHandshake({
    target: 'N02',
    requiredCapability: 'gemini.text.generate',
    correlationId: 'n05-coop-handshake',
    traceId: 'n05-coop-trace',
  });

  assert.equal(result.accepted, true);
  assert.equal(body().capability, 'cooperation.handshake');
  assert.equal(body().correlationId, 'n05-coop-handshake');
  assert.equal(body().traceId, 'n05-coop-trace');
  assert.equal(body().payload.target, 'N02');
  assert.equal(body().payload.required_capability, 'gemini.text.generate');
});

test('N05 exchange preserves target capability and structured payload', async () => {
  const body = installFakeN07();
  const result: any = await n05CooperationExchange({
    target: 'N04',
    capability: 'tool.execute',
    payload: { tool: 'getWeather' },
    correlationId: 'n05-coop-exchange',
  });

  assert.equal(result.accepted, true);
  assert.equal(body().capability, 'cooperation.exchange');
  assert.equal(body().correlationId, 'n05-coop-exchange');
  assert.equal(body().payload.target, 'N04');
  assert.equal(body().payload.capability, 'tool.execute');
  assert.deepEqual(body().payload.payload, { tool: 'getWeather' });
});
