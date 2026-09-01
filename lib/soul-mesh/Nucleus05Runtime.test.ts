import assert from 'node:assert/strict';
import test from 'node:test';
import { Nucleus05Runtime } from './Nucleus05Runtime';
import { N05_CHANNEL_COUNT, N05_IN_CHANNELS, N05_OUT_CHANNELS, N05_PEERS } from './N05ChannelMatrix';

test('N05 registers and executes independent capabilities', async () => {
  const runtime = new Nucleus05Runtime().register('test.tool', async (payload) => ({ ok: true, payload }));
  assert.equal(runtime.has('test.tool'), true);
  assert.deepEqual(await runtime.execute('test.tool', { value: 42 }), { ok: true, payload: { value: 42 } });
});

test('N05 refuses undeclared executable capabilities', async () => {
  const runtime = new Nucleus05Runtime();
  await assert.rejects(() => runtime.execute('missing.capability', null), /CAPABILITY_HANDLER_NOT_REGISTERED/);
});

test('N05 exposes every current bidirectional peer channel, including N07', () => {
  assert.equal(N05_PEERS.length, 6);
  assert.equal(N05_IN_CHANNELS.length, 6);
  assert.equal(N05_OUT_CHANNELS.length, 6);
  assert.equal(N05_CHANNEL_COUNT, 12);
  assert.deepEqual(N05_IN_CHANNELS, ['N05.IN.N01','N05.IN.N02','N05.IN.N03','N05.IN.N04','N05.IN.N06','N05.IN.N07']);
  assert.deepEqual(N05_OUT_CHANNELS, ['N05.OUT.N01','N05.OUT.N02','N05.OUT.N03','N05.OUT.N04','N05.OUT.N06','N05.OUT.N07']);
});
