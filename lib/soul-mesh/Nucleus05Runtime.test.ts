import assert from 'node:assert/strict';
import test from 'node:test';
import { Nucleus05Runtime } from './Nucleus05Runtime';

test('N05 registers and executes independent capabilities', async () => {
  const runtime = new Nucleus05Runtime().register('test.tool', async (payload) => ({ ok: true, payload }));
  assert.equal(runtime.has('test.tool'), true);
  assert.deepEqual(await runtime.execute('test.tool', { value: 42 }), { ok: true, payload: { value: 42 } });
});

test('N05 refuses undeclared executable capabilities', async () => {
  const runtime = new Nucleus05Runtime();
  await assert.rejects(() => runtime.execute('missing.capability', null), /CAPABILITY_HANDLER_NOT_REGISTERED/);
});
