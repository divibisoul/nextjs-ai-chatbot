import type { SoulMeshMessage, SoulMeshTransport, SoulNucleus } from './SoulMeshProtocol';
export class SoulMeshNode {
  constructor(private readonly nucleus: SoulNucleus, private readonly transport: SoulMeshTransport) {}
  onMessage(handler: (message: SoulMeshMessage) => void | Promise<void>): () => void { return this.transport.onMessage(async message => { if (message.target === this.nucleus) await handler(message); }); }
  send<T>(target: SoulNucleus, correlationId: string, payload: T, kind: SoulMeshMessage['kind'] = 'event', capability?: string): Promise<void> { return this.transport.send({ protocol: 'soul-mesh/1', id: crypto.randomUUID(), correlationId, source: this.nucleus, target, kind, capability, payload, timestamp: Date.now() }); }
}
