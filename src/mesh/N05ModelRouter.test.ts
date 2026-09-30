import assert from 'node:assert/strict';
import test from 'node:test';
import { n05ModelRouter } from './N05ModelRouter';

test('N05 routes an explicitly requested model without inventing alternatives', () => {
  const route = n05ModelRouter.route({ requestedModel: 'chat-model-reasoning' });

  assert.equal(route.model, 'chat-model-reasoning');
  assert.match(route.reason, /explicit model request/);
  assert.equal(route.candidates.length, 1);
});

test('N05 route selects from the actually exposed provider models', () => {
  const route = n05ModelRouter.route({
    complexity: 0.95,
    latencyTargetMs: 5000,
    costWeight: 0.1,
    qualityWeight: 0.75,
  });

  assert.ok(['chat-model', 'chat-model-reasoning'].includes(route.model));
  assert.ok(route.candidates.length > 0);
  assert.ok(route.candidates.every(candidate =>
    ['chat-model', 'chat-model-reasoning'].includes(candidate.model),
  ));
});

test('N05 rejects unavailable model requests', () => {
  assert.throws(
    () => n05ModelRouter.route({ requestedModel: 'not-real-model' as never }),
    /N05_REQUESTED_MODEL_UNAVAILABLE/,
  );
});

test('N05 exposes Gemini N02 only when the real N02 endpoint is configured', () => {
  const previous = process.env.SOUL_MESH_N02_URL;
  delete process.env.SOUL_MESH_N02_URL;
  assert.throws(
    () => n05ModelRouter.route({ requestedModel: 'gemini-n02' }),
    /N05_REQUESTED_MODEL_UNAVAILABLE/,
  );

  process.env.SOUL_MESH_N02_URL = 'https://n02.example.invalid';
  const route = n05ModelRouter.route({ requestedModel: 'gemini-n02' });
  assert.equal(route.model, 'gemini-n02');

  if (previous === undefined) delete process.env.SOUL_MESH_N02_URL;
  else process.env.SOUL_MESH_N02_URL = previous;
});

