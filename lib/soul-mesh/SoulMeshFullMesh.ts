import { createSoulMeshMessage, type SoulMeshMessage, type SoulMeshNucleus, type SoulMeshTransport } from './SoulMeshProtocol';
import { SOUL_MESH_NUCLEI, getSoulMeshPeers } from './SoulMeshTopology';

export type SoulMeshHandler = (message: SoulMeshMessage) => void | Promise<void>;

class LocalRoute implements SoulMeshTransport {
  private readonly handlers = new Set<SoulMeshHandler>();
  constructor(private readonly owner: SoulMeshNucleus, private readonly routes: Map<SoulMeshNucleus, Set<SoulMeshHandler>>) {}

  async send(message: SoulMeshMessage): Promise<void> {
    if (message.source !== this.owner) throw new Error(`Source mismatch: expected ${this.owner}`);
    if (!SOUL_MESH_NUCLEI.includes(message.target)) throw new Error(`Unknown Soul Mesh target: ${message.target}`);
    const targetHandlers = this.routes.get(message.target);
    if (!targetHandlers) throw new Error(`No route registered for ${message.target}`);
    await Promise.all([...targetHandlers].map(handler => handler(message)));
  }

  onMessage(handler: SoulMeshHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  async receive(message: SoulMeshMessage): Promise<void> {
    if (message.target !== this.owner) return;
    await Promise.all([...this.handlers].map(handler => handler(message)));
  }
}

export class SoulMeshFullMesh {
  readonly nuclei = SOUL_MESH_NUCLEI;
  readonly directedConnections = SOUL_MESH_NUCLEI.length * (SOUL_MESH_NUCLEI.length - 1);
  private readonly routes = new Map<SoulMeshNucleus, Set<SoulMeshHandler>>();
  private readonly transports = new Map<SoulMeshNucleus, LocalRoute>();

  constructor() {
    for (const nucleus of SOUL_MESH_NUCLEI) this.routes.set(nucleus, new Set());
    for (const nucleus of SOUL_MESH_NUCLEI) this.transports.set(nucleus, new LocalRoute(nucleus, this.routes));
  }

  transport(nucleus: SoulMeshNucleus): SoulMeshTransport {
    if (!this.transports.has(nucleus)) throw new Error(`Unknown Soul Mesh nucleus: ${nucleus}`);
    return this.transports.get(nucleus)!;
  }

  attach(nucleus: SoulMeshNucleus, handler: SoulMeshHandler): () => void {
    const handlers = this.routes.get(nucleus);
    if (!handlers) throw new Error(`Unknown Soul Mesh nucleus: ${nucleus}`);
    handlers.add(handler);
    return () => handlers.delete(handler);
  }

  peers(nucleus: SoulMeshNucleus): readonly SoulMeshNucleus[] {
    return getSoulMeshPeers(nucleus);
  }

  async probeAll(): Promise<{ sent: number; delivered: number }> {
    let sent = 0;
    let delivered = 0;
    const removers: (() => void)[] = [];
    for (const target of this.nuclei) {
      removers.push(this.attach(target, () => { delivered += 1; }));
    }
    try {
      for (const source of this.nuclei) {
        for (const target of this.peers(source)) {
          sent += 1;
          await this.transport(source).send(createSoulMeshMessage({ source, target, correlationId: null, kind: 'event', capability: 'mesh-probe', payload: { source, target } }));
        }
      }
      return { sent, delivered };
    } finally {
      removers.forEach(remove => remove());
    }
  }
}
