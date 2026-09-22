import test from 'node:test';
import assert from 'node:assert/strict';
import { saraHealth, saraCapabilities, saraState, saraAudit, saraRegenerate, saraClareiraAudit } from './SARAClient';

test('N05 exposes additive SARA operations beyond chat cycle', async () => {
  const originalFetch = globalThis.fetch;
  const oldUrl = process.env.SARA_BASE_URL;
  const oldToken = process.env.SARA_API_TOKEN;
  let observed: { path: string; method: string; auth?: string; correlation?: string } | null = null;

  process.env.SARA_BASE_URL = 'http://sara.test';
  delete process.env.SARA_API_TOKEN;

  globalThis.fetch = async (input, init) => {
    const url = String(input);
    const path = new URL(url).pathname;
    observed = {
      path,
      method: String(init?.method ?? 'GET'),
      auth: (init?.headers as Record<string, string> | undefined)?.authorization,
      correlation: (init?.headers as Record<string, string> | undefined)?.['X-Correlation-ID'],
    };
    return new Response(JSON.stringify({ ok: true, correlation_id: observed.correlation }), {
      status: 200,
      headers: { 'content-type': 'application/json', 'X-Correlation-ID': observed.correlation ?? '' },
    });
  };

  try {
    const health = await saraHealth();
    assert.equal(health.ok, true);
    assert.equal(observed?.path, '/health');
    assert.equal(observed?.auth, undefined);

    process.env.SARA_API_TOKEN = 'token';
    await saraCapabilities();
    assert.equal(observed?.path, '/v1/capabilities');
    await saraState();
    assert.equal(observed?.path, '/v1/state');

    await saraAudit('auditar contexto', 'n05-audit-001');
    assert.equal(observed?.path, '/v1/audit');
    assert.equal(observed?.method, 'POST');
    assert.equal(observed?.correlation, 'n05-audit-001');

    await saraRegenerate('regenerar contexto', 'n05-regenerate-001');
    assert.equal(observed?.path, '/v1/regenerate');
    assert.equal(observed?.correlation, 'n05-regenerate-001');

    await saraClareiraAudit('n05-clareira-audit-001');
    assert.equal(observed?.path, '/v1/clareira/audit');
    assert.equal(observed?.method, 'GET');
    assert.equal(observed?.correlation, 'n05-clareira-audit-001');
  } finally {
    globalThis.fetch = originalFetch;
    if (oldUrl === undefined) delete process.env.SARA_BASE_URL;
    else process.env.SARA_BASE_URL = oldUrl;
    if (oldToken === undefined) delete process.env.SARA_API_TOKEN;
    else process.env.SARA_API_TOKEN = oldToken;
  }
});
