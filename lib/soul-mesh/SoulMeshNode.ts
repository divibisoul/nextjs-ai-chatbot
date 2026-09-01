import type { SoulMeshMessage, SoulMeshTransport, SoulNucleus } from './SoulMeshProtocol';
import { createSoulMeshMessage } from './SoulMeshProtocol';

export class SoulMeshNode {
  private readonly nucleus: SoulNucleus;
  private readonly transport: SoulMeshTransport;

  constructor(nucleus: SoulNucleus, transport: SoulMeshTransport) {
    this.nucleus = nucleus;
    this.transport = transport;
  }

  onMessage(handler: (message: SoulMeshMessage) => void | Promise<void>): () => void {
    return this.transport.onMessage(async message => {
      if (message.target === this.nucleus) await handler(message);
    });
  }

  send<T>(target: SoulNucleus, correlationId: string, payload: T, kind: SoulMeshMessage['kind'] = 'event', capability?: string): Promise<void> {
    return this.transport.send(createSoulMeshMessage({
      correlationId,
      source: this.nucleus,
      target,
      kind,
      capability,
      payload,
    }));
  }
}
