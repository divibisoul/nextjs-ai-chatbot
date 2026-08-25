import { randomUUID } from 'node:crypto';

export const SOUL_NUCLEUS_ID = 'nucleus-01-ai';
export const SOUL_PROTOCOL_VERSION = '1.0';

export type SoulMessageType = 'event' | 'request' | 'response' | 'ack' | 'health';

export interface SoulMessage<TPayload = unknown> {
  id: string;
  source: string;
  target: string;
  type: SoulMessageType;
  name: string;
  timestamp: string;
  correlationId: string | null;
  payload: TPayload;
}

export interface NucleusHealth {
  nucleusId: typeof SOUL_NUCLEUS_ID;
  protocolVersion: typeof SOUL_PROTOCOL_VERSION;
  role: 'ai-interaction-reasoning';
  status: 'ready' | 'degraded' | 'offline';
  capabilities: readonly string[];
  timestamp: string;
}

export const NUCLEUS_01_CAPABILITIES = [
  'conversation',
  'reasoning',
  'model-routing',
  'streaming',
  'tool-orchestration',
  'chat-persistence',
] as const;

export function createSoulMessage<TPayload>(input: Omit<SoulMessage<TPayload>, 'id' | 'timestamp'>): SoulMessage<TPayload> {
  return {
    ...input,
    id: randomUUID(),
    timestamp: new Date().toISOString(),
  };
}

export function getNucleus01Health(): NucleusHealth {
  return {
    nucleusId: SOUL_NUCLEUS_ID,
    protocolVersion: SOUL_PROTOCOL_VERSION,
    role: 'ai-interaction-reasoning',
    status: 'ready',
    capabilities: NUCLEUS_01_CAPABILITIES,
    timestamp: new Date().toISOString(),
  };
}
