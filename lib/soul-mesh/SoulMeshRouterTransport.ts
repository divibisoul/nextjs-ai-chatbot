import type { SoulMeshMessage, SoulMeshTransport, SoulNucleus } from './SoulMeshProtocol';

export type SoulMeshPeerEndpoints = Record<SoulNucleus, string>;

export class SoulMeshRouterTransport implements SoulMeshTransport {
  private readonly listeners = new Set<(message: SoulMeshMessage) => void | Promise<void>>();

  constructor(private readonly endpoints: SoulMeshPeerEndpoints, private readonly headers: Record<string, string> = {}) {}

  async send(message: SoulMeshMessage): Promise<void> {
    const endpoint = this.endpoints[message.target];
    if (!endpoint) throw new Error(`No Soul Mesh endpoint configured for ${message.target}`);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...this.headers },
      body: JSON.stringify(message),
    });
    if (!response.ok) throw new Error(`Soul Mesh transport failed for ${message.target}: ${response.status}`);
  }

  onMessage(handler: (message: SoulMeshMessage) => void | Promise<void>): () => void {
    this.listeners.add(handler);
    return () => this.listeners.delete(handler);
  }

  async receive(message: SoulMeshMessage): Promise<void> {
    await Promise.allSettled([...this.listeners].map((listener) => listener(message)));
  }
}
