import type { SoulMessage } from '../soul/nucleus';
import type { SoulTransport } from '../soul/nucleus-transport';
import type { SoulMeshMessage, SoulMeshNucleus, SoulMeshTransport } from './SoulMeshProtocol';

export type SoulNucleusIdMap = { local: SoulMeshNucleus; peers: Record<string, SoulMeshNucleus> };

export class SoulMeshNucleusBridge implements SoulTransport {
  private readonly listeners = new Set<(message: SoulMessage) => void | Promise<void>>();
  private unsubscribe: (() => void) | null = null;

  constructor(private readonly mesh: SoulMeshTransport, private readonly ids: SoulNucleusIdMap) {
    this.unsubscribe = mesh.onMessage((message) => this.handleMeshMessage(message));
  }

  async send(message: SoulMessage): Promise<void> {
    const target = this.ids.peers[message.target];
    if (!target) throw new Error(`No mesh peer mapping for ${message.target}`);
    const meshMessage: SoulMeshMessage = {
      protocol: 'soul-mesh/1',
      id: message.id,
      correlationId: message.correlationId ?? message.id,
      source: this.ids.local,
      target,
      kind: message.type === 'request' ? 'request' : message.type === 'response' ? 'response' : message.type === 'event' ? 'event' : 'error',
      capability: message.name,
      payload: message.payload,
      timestamp: Date.parse(message.timestamp) || Date.now(),
    };
    await this.mesh.send(meshMessage);
  }

  onMessage(handler: (message: SoulMessage) => void | Promise<void>): () => void {
    this.listeners.add(handler);
    return () => this.listeners.delete(handler);
  }

  async receive(message: SoulMessage): Promise<void> {
    await Promise.allSettled([...this.listeners].map((listener) => listener(message)));
  }

  close(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.listeners.clear();
  }

  private async handleMeshMessage(message: SoulMeshMessage): Promise<void> {
    if (message.target !== this.ids.local) return;
    const source = Object.entries(this.ids.peers).find(([, nucleus]) => nucleus === message.source)?.[0];
    if (!source) return;

    const type: SoulMessage['type'] = message.kind === 'request' ? 'request' : message.kind === 'response' ? 'response' : message.kind === 'event' ? 'event' : 'error';
    const soulMessage: SoulMessage = {
      id: message.id,
      source,
      target: 'nucleus-01-ai',
      type,
      name: message.capability ?? message.kind,
      timestamp: new Date(message.timestamp).toISOString(),
      correlationId: message.correlationId || null,
      payload: message.payload,
    };
    await this.receive(soulMessage);
  }
}
