export type SoulNucleus = 'aeternum' | 'nexus' | 'eternium' | 'chatbot' | 'chatbots' | 'chatbot-2000';
export type SoulMeshMessageKind = 'request' | 'response' | 'ack' | 'event' | 'error';

export interface SoulMeshMessage<T = unknown> {
  protocol: 'soul-mesh/1';
  id: string;
  correlationId: string | null;
  source: SoulNucleus;
  target: SoulNucleus;
  kind: SoulMeshMessageKind;
  capability?: string;
  payload: T;
  timestamp: number;
}

export interface SoulMeshTransport {
  send(message: SoulMeshMessage): Promise<void>;
  onMessage(handler: (message: SoulMeshMessage) => void | Promise<void>): () => void;
}

export function createSoulMeshMessage<T>(input: Omit<SoulMeshMessage<T>, 'protocol' | 'id' | 'timestamp'>): SoulMeshMessage<T> {
  return { protocol: 'soul-mesh/1', id: crypto.randomUUID(), timestamp: Date.now(), ...input };
}

export function isSoulMeshMessage(value: unknown): value is SoulMeshMessage {
  if (!value || typeof value !== 'object') return false;
  const m = value as Record<string, unknown>;
  return m.protocol === 'soul-mesh/1'
    && typeof m.id === 'string'
    && (m.correlationId === null || typeof m.correlationId === 'string')
    && typeof m.source === 'string'
    && typeof m.target === 'string'
    && ['request', 'response', 'ack', 'event', 'error'].includes(String(m.kind));
}
