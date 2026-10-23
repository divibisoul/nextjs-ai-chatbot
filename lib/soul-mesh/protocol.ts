export const SOUL_MESH_PROTOCOL = 'soul-mesh/1' as const;
export const SOUL_NUCLEI = ['N01','N02','N03','N04','N05','N06'] as const;
export type SoulNucleus = typeof SOUL_NUCLEI[number];
export type SoulMeshKind = 'request' | 'response' | 'event' | 'error' | 'ack';

export interface SoulMeshMessage<T = unknown> {
  protocol: typeof SOUL_MESH_PROTOCOL;
  id: string;
  correlationId: string;
  source: SoulNucleus;
  target: SoulNucleus;
  kind: SoulMeshKind;
  capability?: string;
  payload: T;
  timestamp: number;
}

export function validateSoulMeshMessage(message: SoulMeshMessage): void {
  if (message.protocol !== SOUL_MESH_PROTOCOL) throw new Error('INVALID_PROTOCOL');
  if (!SOUL_NUCLEI.includes(message.source) || !SOUL_NUCLEI.includes(message.target)) throw new Error('INVALID_NUCLEUS');
  if (message.source === message.target) throw new Error('SELF_ROUTE_NOT_ALLOWED');
  if (!message.id || !message.correlationId) throw new Error('INVALID_CORRELATION');
  if (!message.kind) throw new Error('INVALID_KIND');
  if (message.kind === 'request' && !message.capability?.trim()) throw new Error('CAPABILITY_REQUIRED');
  if (!Number.isFinite(message.timestamp)) throw new Error('INVALID_TIMESTAMP');
}
