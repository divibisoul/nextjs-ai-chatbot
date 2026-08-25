import { createSoulMessage, SOUL_NUCLEUS_ID, type SoulMessage } from './nucleus';

export type SoulTransport = {
  send: (message: SoulMessage) => Promise<void>;
  close?: () => Promise<void>;
};
export type SoulInboundHandler = (message: SoulMessage) => Promise<void> | void;

export function createNucleusTransport(transport: SoulTransport, onMessage: SoulInboundHandler, timeoutMs = 30_000) {
  let closed = false;
  const seen = new Set<string>();
  const pending = new Map<string, { request: SoulMessage; expiresAt: number }>();

  const purgeExpired = () => {
    const now = Date.now();
    for (const [id, entry] of pending) if (entry.expiresAt <= now) pending.delete(id);
  };

  return {
    async send(target: string, name: string, payload: unknown, correlationId: string | null = null) {
      if (closed) throw new Error('Soul nucleus transport is closed');
      if (!target || !name) throw new Error('Soul request requires target and name');
      if (correlationId !== null && !correlationId) throw new Error('Invalid correlationId');
      purgeExpired();
      const message = createSoulMessage({ source: SOUL_NUCLEUS_ID, target, type: 'request', name, correlationId, payload });
      pending.set(message.id, { request: message, expiresAt: Date.now() + timeoutMs });
      try {
        await transport.send(message);
      } catch (error) {
        pending.delete(message.id);
        throw error;
      }
      return message;
    },

    async receive(message: SoulMessage) {
      if (closed) return;
      purgeExpired();
      if (!message.id || !message.source || !message.target || !message.type || !message.name) throw new Error('Invalid Soul protocol message');
      if (seen.has(message.id)) return;
      seen.add(message.id);

      if (message.type === 'response' || message.type === 'ack') {
        if (!message.correlationId) throw new Error('Soul response requires correlationId');
        const pendingRequest = pending.get(message.correlationId);
        if (!pendingRequest) throw new Error('Unknown or expired Soul correlationId');
        if (pendingRequest.request.target !== message.source) throw new Error('Soul correlation source mismatch');
        pending.delete(message.correlationId);
      }
      await onMessage(message);
    },

    pendingCount() {
      purgeExpired();
      return pending.size;
    },

    async close() {
      closed = true;
      pending.clear();
      await transport.close?.();
    },
  };
}
