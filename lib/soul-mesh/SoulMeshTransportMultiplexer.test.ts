import assert from 'node:assert/strict';
import test from 'node:test';
import type { SoulMeshMessage, SoulMeshTransport } from './SoulMeshProtocol';
import { SoulMeshTransportMultiplexer } from './SoulMeshTransportMultiplexer';

const message: SoulMeshMessage = {
  protocol: 'soul-mesh/1', id: 'id', correlationId: 'corr', source: 'N05', target: 'N01', kind: 'request', capability: 'mesh.ping', payload: {}, timestamp: Date.now(),
};

function transport(send: SoulMeshTransport['send']): SoulMeshTransport {
  return { send, onMessage: () => () => undefined };
}

test('multiplexer isolates a failed transport and delivers through a healthy one', async () => {
  let delivered = false;
  const mux = new SoulMeshTransportMultiplexer([
    transport(async () => { throw new Error('primary down'); }),
    transport(async () => { delivered = true; }),
  ]);
  await mux.send(message);
  assert.equal(delivered, true);
});

test('multiplexer fails only when every transport fails', async () => {
  const mux = new SoulMeshTransportMultiplexer([
    transport(async () => { throw new Error('http down'); }),
    transport(async () => { throw new Error('realtime down'); }),
  ]);
  await assert.rejects(() => mux.send(message), /SOUL_MESH_ALL_TRANSPORTS_FAILED/);
});
