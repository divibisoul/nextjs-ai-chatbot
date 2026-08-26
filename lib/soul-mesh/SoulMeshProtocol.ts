import type { SoulNucleusId } from './SoulMeshTopology';

export type SoulNucleus = SoulNucleusId;
export type SoulMeshTransportKind = 'IN_PROCESS' | 'WEBVIEW_BRIDGE' | 'LOOPBACK_HTTP' | 'HTTP' | 'REALTIME';
export type SoulMeshProof = 'UNVERIFIED' | 'NEGOTIATING' | 'CONNECTED' | 'EXECUTED' | 'VERIFIED';

export interface SoulMeshMessage<T = unknown> {
  protocol: 'soul-mesh/1';
  id: string;
  correlationId: string;
  source: SoulNucleus;
  target: SoulNucleus;
  kind: 'request' | 'response' | 'event' | 'error';
  capability?: string;
  payload: T;
  timestamp: number;
  channelId?: string;
  transport?: SoulMeshTransportKind;
  proof?: SoulMeshProof;
}

export interface SoulMeshTransport {
  send(message: SoulMeshMessage): Promise<void>;
  onMessage(handler: (message: SoulMeshMessage) => void | Promise<void>): () => void;
}

export function createSoulMeshMessage<T>(input: Omit<SoulMeshMessage<T>, 'protocol' | 'id' | 'timestamp'>): SoulMeshMessage<T> {
  const channelId = input.channelId ?? `${input.source}.OUT.${input.target}`;
  return { protocol: 'soul-mesh/1', id: crypto.randomUUID(), timestamp: Date.now(), ...input, channelId };
}

export function isSoulMeshMessage(value: unknown): value is SoulMeshMessage {
  if (!value || typeof value !== 'object') return false;
  const m = value as Record<string, unknown>;
  return m.protocol === 'soul-mesh/1' && typeof m.id === 'string' && typeof m.correlationId === 'string' && typeof m.source === 'string' && typeof m.target === 'string' && typeof m.kind === 'string';
}
