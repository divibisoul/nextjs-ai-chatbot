import { describe, expect, it } from 'vitest';
import {
  createSoulMessage,
  getNucleus01Health,
  NUCLEUS_01_CAPABILITIES,
  NUCLEUS_01_FORBIDDEN_PLATFORM_CONTROLS,
  SOUL_NUCLEUS_ID,
  SOUL_PROTOCOL_VERSION,
} from './nucleus';

describe('Soul nucleus 01', () => {
  it('creates a correlated protocol message with generated identity and timestamp', () => {
    const message = createSoulMessage({
      source: SOUL_NUCLEUS_ID,
      target: 'nucleus-02',
      type: 'request',
      name: 'capability.query',
      correlationId: 'test-correlation',
      payload: { capability: 'health' },
    });

    expect(message.id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(message.timestamp).toMatch(/Z$/);
    expect(message.correlationId).toBe('test-correlation');
    expect(message.source).toBe(SOUL_NUCLEUS_ID);
  });

  it('reports the declared nucleus contract', () => {
    const health = getNucleus01Health();

    expect(health.nucleusId).toBe(SOUL_NUCLEUS_ID);
    expect(health.protocolVersion).toBe(SOUL_PROTOCOL_VERSION);
    expect(health.role).toBe('ai-interaction-reasoning');
    expect(health.status).toBe('ready');
    expect(health.capabilities).toEqual(NUCLEUS_01_CAPABILITIES);
    expect(health.forbiddenPlatformControls).toEqual(
      NUCLEUS_01_FORBIDDEN_PLATFORM_CONTROLS,
    );
  });
});
