import assert from 'node:assert/strict';
import test from 'node:test';
import { createNucleusTransport } from './nucleus-transport';

const response = {
  id: 'm1', source: 'nucleus-02', target: 'nucleus-01-ai', type: 'response' as const,
  name: 'capability.result', timestamp: new Date().toISOString(), correlationId: 'request-1', payload: { ok: true },
};

test('sends through the supplied transport and tracks the request', async () => {
  const sent: any[] = [];
  const transport = createNucleusTransport({ send: async (message) => sent.push(message) }, () => undefined);
  const outbound = await transport.send('nucleus-02', 'capability.query', { name: 'health' }, 'request-1');
  assert.equal(sent.length, 1);
  assert.equal(outbound.target, 'nucleus-02');
  assert.equal(transport.pendingCount(), 1);
});

test('correlates a response and clears the pending request', async () => {
  let calls = 0;
  const transport = createNucleusTransport({ send: async () => undefined }, () => { calls += 1; });
  const outbound = await transport.send('nucleus-02', 'capability.query', { name: 'health' });
  await transport.receive({ ...response, correlationId: outbound.id });
  assert.equal(calls, 1);
  assert.equal(transport.pendingCount(), 0);
});

test('suppresses duplicate inbound messages', async () => {
  let calls = 0;
  const transport = createNucleusTransport({ send: async () => undefined }, () => { calls += 1; });
  await transport.receive({ ...response, correlationId: 'unknown' }).catch(() => undefined);
  assert.equal(calls, 0);
});

test('rejects malformed and unknown correlations', async () => {
  const transport = createNucleusTransport({ send: async () => undefined }, () => undefined);
  await assert.rejects(() => transport.receive({ ...response, id: '', correlationId: 'x' }), /Invalid Soul protocol message/);
  await assert.rejects(() => transport.receive({ ...response, id: 'm2', correlationId: 'unknown' }), /Unknown or expired Soul correlationId/);
});
