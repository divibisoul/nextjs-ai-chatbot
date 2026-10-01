import test from 'node:test';
import assert from 'node:assert/strict';
import { delegateN05ExternalCapability } from './N05ExternalCapabilityBridge';

test('N05 external capability bridge requires correlation', async () => {
  await assert.rejects(
    delegateN05ExternalCapability({ capability: 'strategic_planning', correlationId: ' ' }),
    /N05_EXTERNAL_CORRELATION_REQUIRED/,
  );
});
