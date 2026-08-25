import { createSoulMessage, SOUL_NUCLEUS_ID, type SoulMessage } from './nucleus';

export type SoulTransport = {
  send: (message: SoulMessage) => Promise<void>;
  close?: () => Promise<void>;
};
export type SoulInboundHandler = (message: SoulMessage) => Promise<void> | void;

export function createNucleusTransport(transport: SoulTransport, onMessage: SoulInboundHandler) {
  let closed = false;
  const seen = new Set<string>();
  const pending = new Map<string, SoulMessage>();

  return {
    async send(target: string, name: string, payload: unknown, correlationId: string | null = null) {
      if (closed) throw new Error('Soul nucleus transport is closed');
      const message = createSoulMessage({ source: SOUL_NUCLEUS_ID, target, type: 'request', name, correlationId, payload });
      pending.set(message.id, message);
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
      if (!message.id || !message.source || !message.target || !message.type || !message.name) throw new Error('Invalid Soul protocol message');
      if (seen.has(message.id)) return;
      seen.add(message.id);

      if ((message.type === 'response' || message.type === 'ack') && message.correlationId) {
        const request = pending.get(message.correlationId);
        if (request) pending.delete(message.correlationId);
      }
      await onMessage(message);
    },

    pendingCount() {
      return pending.size;
    },

    async close() {
      closed = true;
      pending.clear();
      await transport.close?.();
    },
  };
}
