import type { SoulMeshMessage, SoulMeshTransport } from './SoulMeshProtocol';

/**
 * Keeps N05 transport mechanisms independent while allowing them to cooperate.
 * A failed transport is isolated; the request succeeds when any transport does.
 */
export class SoulMeshTransportMultiplexer implements SoulMeshTransport {
  constructor(private readonly transports: SoulMeshTransport[]) {}

  async send(message: SoulMeshMessage): Promise<void> {
    if (this.transports.length === 0) throw new Error('SOUL_MESH_NO_TRANSPORTS');
    const failures: unknown[] = [];
    let delivered = false;

    for (const transport of this.transports) {
      try {
        await transport.send(message);
        delivered = true;
      } catch (error) {
        failures.push(error);
      }
    }

    if (!delivered) {
      const detail = failures.map((error) => error instanceof Error ? error.message : String(error)).join('; ');
      throw new Error(`SOUL_MESH_ALL_TRANSPORTS_FAILED${detail ? `:${detail}` : ''}`);
    }
  }

  onMessage(handler: (message: SoulMeshMessage) => void | Promise<void>): () => void {
    const unsubscribe = this.transports.map((transport) => transport.onMessage(handler));
    return () => unsubscribe.forEach((remove) => remove());
  }
}
