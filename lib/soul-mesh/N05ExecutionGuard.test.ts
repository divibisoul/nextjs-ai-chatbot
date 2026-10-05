import assert from 'node:assert/strict';
import test from 'node:test';
import { isN05ExecutableCapability, validateN05CorrelationHeader } from './N05ExecutionGuard';

test('N05 correlation header must match body correlationId when supplied', () => {
  const message = {
    protocol: 'soul-mesh/1',
    contractVersion: '1.1.0',
    id: 'msg-1',
    correlationId: 'corr-1',
    source: 'N01',
    target: 'N05',
    kind: 'request',
    capability: 'ai.infer',
    payload: {},
    timestamp: Date.now(),
  } as const;

  validateN05CorrelationHeader(
    new Request('http://localhost/api/soul-mesh', { headers: { 'x-soul-correlation-id': 'corr-1' } }),
    message,
  );

  assert.throws(
    () => validateN05CorrelationHeader(
      new Request('http://localhost/api/soul-mesh', { headers: { 'x-soul-correlation-id': 'corr-2' } }),
      message,
    ),
    /CORRELATION_ID_MISMATCH/,
  );
});

test('N05 executable gate does not confuse declaration with registration', () => {
  const gateway = { has: (capability: string) => capability === 'ai.infer' };
  assert.equal(isN05ExecutableCapability(gateway, 'ai.infer'), true);
  assert.equal(isN05ExecutableCapability(gateway, 'declared-only.capability'), false);
  assert.equal(isN05ExecutableCapability(gateway, '   '), false);
});
