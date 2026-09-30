import test from 'node:test';
import assert from 'node:assert/strict';
import { saraHealth, saraCapabilities, saraState, saraAudit, saraRegenerate } from './SARAClient';

test('N05 exposes additive SARA operations beyond chat cycle', async () => {
  const originalFetch = globalThis.fetch;
  const oldUrl = process.env.SARA_BASE_URL;
  const oldToken = process.env.SARA_API_TOKEN;
  let observed: { path: string; method: string; auth?: string; correlation?: string } = { path: '', method: '' };

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
  } finally {
    globalThis.fetch = originalFetch;
    if (oldUrl === undefined) delete process.env.SARA_BASE_URL;
    else process.env.SARA_BASE_URL = oldUrl;
    if (oldToken === undefined) delete process.env.SARA_API_TOKEN;
    else process.env.SARA_API_TOKEN = oldToken;
  }
});


test('N05 propagates a federated SARA context without dropping cycle correlation', async () => {
  const oldFetch = globalThis.fetch;
  const previousBase = process.env.SARA_BASE_URL;
  const previousToken = process.env.SARA_API_TOKEN;
  process.env.SARA_BASE_URL = 'https://sara.test';
  process.env.SARA_API_TOKEN = 'token';
  let seen: any = null;

  globalThis.fetch = async (_input, init) => {
    seen = JSON.parse(String(init?.body));
    return new Response(JSON.stringify({
      cycle_id: 'cycle-context',
      final_state: 'ok',
      converged: true,
      rollback_performed: false,
      execution_report: {},
      trace_hash: 'hash-context',
      probabilistic: { observed: true },
    }), {
      status: 200,
      headers: { 'content-type': 'application/json', 'X-Correlation-ID': 'corr-context' },
    });
  };

  try {
    const { saraCycle } = await import('./SARAClient');
    const result = await saraCycle('use shared context', 'corr-context', {
      session_id: 'session-1',
      client: 'n05',
      pipeline: { selected_chat_model: 'model-x' },
      probabilistic: { observed: true },
    });
    assert.equal(seen.cycle_id, 'corr-context');
    assert.equal(seen.context.client, 'n05');
    assert.equal(seen.context.pipeline.selected_chat_model, 'model-x');
    assert.deepEqual(seen.context.probabilistic, { observed: true });
    assert.equal(result.cycle_id, 'cycle-context');
    assert.deepEqual(result.probabilistic, { observed: true });
  } finally {
    globalThis.fetch = oldFetch;
    if (previousBase === undefined) delete process.env.SARA_BASE_URL; else process.env.SARA_BASE_URL = previousBase;
    if (previousToken === undefined) delete process.env.SARA_API_TOKEN; else process.env.SARA_API_TOKEN = previousToken;
  }
});
