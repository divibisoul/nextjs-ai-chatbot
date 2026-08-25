import { describe, expect, it } from 'vitest';
import {
  SOUL_NUCLEUS_ID,
  createSoulMessage,
  getNucleus01Health,
} from './nucleus';

describe('Nucleus 01 Soul boundary', () => {
  it('creates a protocol message with identity and correlation fields', () => {
    const message = createSoulMessage({
      source: SOUL_NUCLEUS_ID,
      target: 'nucleus-02',
      type: 'request',
      name: 'health.check',
      correlationId: null,
      payload: { request: true },
    });

    expect(message.id).toEqual(expect.any(String));
    expect(message.timestamp).toEqual(expect.any(String));
    expect(message.source).toBe(SOUL_NUCLEUS_ID);
    expect(message.target).toBe('nucleus-02');
  });

  it('reports the nucleus capabilities without owning Android controls', () => {
    const health = getNucleus01Health();

    expect(health.nucleusId).toBe(SOUL_NUCLEUS_ID);
    expect(health.status).toBe('ready');
    expect(health.capabilities).toContain('reasoning');
    expect(health.capabilities).not.toContain('wifi-control');
    expect(health.capabilities).not.toContain('bluetooth-control');
  });
});
