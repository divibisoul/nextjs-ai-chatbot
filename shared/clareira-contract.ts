/**
 * CLAREIRA FEDERATION CONTRACT v1
 * Additive contract shared by the eight federation nuclei.
 * This file does not replace the local Soul Mesh envelope; ClareiraPacket
 * is an application-level packet carried by the existing soul-mesh/1 fabric.
 */

export const CLAREIRA_CONTRACT_VERSION = '1.0.0' as const;

export type ClareiraPacketType =
  | 'Data'
  | 'StateReport'
  | 'DecisionRequest'
  | 'DecisionResponse'
  | 'Control'
  | 'Heartbeat';

export interface ClareiraPacket {
  id: string;
  data: string;
  informationalValue: number;
  criticality: number;
  packetType: ClareiraPacketType;
  sourceId: string;
  destinationHint?: string;
  timestamp: number;
  correlationId: string;
  metadata: Record<string, string | number | boolean>;
}

export interface ClareiraMetrics {
  capturedAtMs: number;
  nodes: { total: number; active: number; errored: number };
  channels: { total: number; open: number };
  packets: {
    ingested: number;
    processed: number;
    dropped: number;
    errored: number;
    inFlight: number;
  };
  latencyMs: { last: number; p50: number; p95: number; max: number };
  uptimeMs: number;
}

export interface ClareiraEventMap {
  'clareira.packet.ingested': { correlationId: string; sourceId: string };
  'clareira.packet.processed': { correlationId: string; latencyMs: number };
  'clareira.packet.dropped': { correlationId: string; reason: string };
  'clareira.degraded': { reason: string };
  'clareira.started': { at: number };
  'clareira.stopped': { at: number };
}

export function isClareiraPacket(value: unknown): value is ClareiraPacket {
  if (!value || typeof value !== 'object') return false;
  const p = value as Record<string, unknown>;
  return typeof p.id === 'string' && p.id.length > 0 &&
    typeof p.data === 'string' &&
    typeof p.informationalValue === 'number' && Number.isFinite(p.informationalValue) &&
    typeof p.criticality === 'number' && Number.isFinite(p.criticality) &&
    p.criticality >= 0 && p.criticality <= 1 &&
    typeof p.packetType === 'string' &&
    ['Data','StateReport','DecisionRequest','DecisionResponse','Control','Heartbeat'].includes(p.packetType) &&
    typeof p.sourceId === 'string' && p.sourceId.length > 0 &&
    (p.destinationHint === undefined || typeof p.destinationHint === 'string') &&
    typeof p.timestamp === 'number' && Number.isFinite(p.timestamp) &&
    typeof p.correlationId === 'string' && p.correlationId.length > 0 &&
    !!p.metadata && typeof p.metadata === 'object' && !Array.isArray(p.metadata);
}

export function createClareiraPacket(
  data: string,
  sourceId: string,
  correlationId: string,
  options: Partial<Omit<ClareiraPacket, 'id' | 'data' | 'sourceId' | 'correlationId' | 'timestamp'>> = {},
): ClareiraPacket {
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `clareira_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    data,
    informationalValue: options.informationalValue ?? 10,
    criticality: options.criticality ?? 0.5,
    packetType: options.packetType ?? 'Data',
    sourceId,
    destinationHint: options.destinationHint,
    timestamp: Date.now(),
    correlationId,
    metadata: options.metadata ?? {},
  };
}
