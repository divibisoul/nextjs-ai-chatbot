import test from 'node:test';
import assert from 'node:assert/strict';
import { saraCycle } from './SARAClient';

test('N05 forwards optional federated context to SARA', async () => {
  process.env.SARA_BASE_URL = 'http://sara.test';
  process.env.SARA_API_TOKEN = 'token';
  const original = globalThis.fetch;
  let observed: any = null;
  globalThis.fetch = async (_input, init) => {
    observed = JSON.parse(String(init?.body ?? '{}'));
    return new Response(JSON.stringify({
      cycle_id: 'n05-cycle',
      final_state: 'ok',
      converged: true,
      rollback_performed: false,
      execution_report: {},
      trace_hash: 'trace',
      probabilistic: { nodes: [] },
    }), { status: 200, headers: { 'content-type': 'application/json', 'X-Correlation-ID': 'n05-corr' } });
  };
  try {
    const result = await saraCycle('input', 'n05-corr', {
      session_id: 'session-005',
      client: 'web',
      probabilistic: { nodes: [] },
    });
    assert.equal(observed.context.client, 'web');
    assert.deepEqual(observed.context.probabilistic.nodes, []);
    assert.equal(result.probabilistic?.nodes instanceof Array, true);
  } finally { globalThis.fetch = original; }
});
