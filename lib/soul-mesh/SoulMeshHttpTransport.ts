import type { SoulMeshMessage, SoulMeshTransport } from './SoulMeshProtocol';
export class SoulMeshHttpTransport implements SoulMeshTransport {
  private listeners = new Set<(message: SoulMeshMessage) => void | Promise<void>>();
  constructor(private readonly endpoint: string, private readonly headers: Record<string, string> = {}) {}
  async send(message: SoulMeshMessage): Promise<void> { const response = await fetch(this.endpoint, { method: 'POST', headers: { 'content-type': 'application/json', ...this.headers }, body: JSON.stringify(message) }); if (!response.ok) throw new Error(`Soul Mesh transport failed: ${response.status}`); }
  onMessage(handler: (message: SoulMeshMessage) => void | Promise<void>): () => void { this.listeners.add(handler); return () => this.listeners.delete(handler); }
  async receive(message: SoulMeshMessage): Promise<void> { await Promise.allSettled([...this.listeners].map(listener => listener(message))); }
}
