import test from 'node:test';
import assert from 'node:assert/strict';
import { SOUL_MESH_CAPABILITIES } from './SoulMeshCapabilities';
import { createN05CapabilityGateway } from '@/src/mesh/N05Capabilities';

test('N05 publishes the inference capabilities already implemented by its runtime', () => {
  const ids = new Set(SOUL_MESH_CAPABILITIES.map(capability => capability.id));
  for (const id of [
    'inference.reason',
    'inference.analyze',
    'inference.summarize',
    'inference.translate',
    'inference.classify',
    'conversation.chat',
    'conversation.memory',
  ]) {
    assert.equal(ids.has(id), true, id);
  }
});

test('N05 gateway registers the published inference capabilities', () => {
  const gateway = createN05CapabilityGateway();
  for (const id of [
    'inference.reason',
    'inference.analyze',
    'inference.summarize',
    'inference.translate',
    'inference.classify',
    'conversation.chat',
    'conversation.memory',
  ]) {
    assert.equal(gateway.has(id), true, id);
  }
});
