import { describe, expect, it } from 'vitest';
import { createNucleusTransport } from './nucleus-transport';

const message = {
  id: 'm1', source: 'nucleus-02', target: 'nucleus-01-ai', type: 'response' as const,
  name: 'capability.result', timestamp: new Date().toISOString(), correlationId: 'c1', payload: { ok: true },
};

describe('Nucleus 01 transport boundary', () => {
  it('sends through the supplied transport', async () => {
    const sent: unknown[] = [];
    const transport = createNucleusTransport({ send: async (m) => sent.push(m) }, () => undefined);
    const outbound = await transport.send('nucleus-02', 'capability.query', { name: 'health' }, 'c1');
    expect(sent).toHaveLength(1);
    expect(outbound.target).toBe('nucleus-02');
  });

  it('suppresses duplicate inbound messages', async () => {
    let calls = 0;
    const transport = createNucleusTransport({ send: async () => undefined }, () => { calls += 1; });
    await transport.receive(message);
    await transport.receive(message);
    expect(calls).toBe(1);
  });

  it('rejects malformed messages', async () => {
    const transport = createNucleusTransport({ send: async () => undefined }, () => undefined);
    await expect(transport.receive({ ...message, id: '' })).rejects.toThrow('Invalid Soul protocol message');
  });
});
