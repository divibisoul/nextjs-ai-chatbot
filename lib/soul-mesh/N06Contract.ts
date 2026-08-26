import type { SoulMeshMessage } from './endpoint';

export const N06_CAPABILITIES = [
  'ai-pilot','tool-execution','artifact-processing','document-processing',
  'context-orchestration','streaming','mesh-communication',
  'support.context','support.artifacts','support.documents',
  'support.tool-execution','support.streaming','support.mesh','support.ai-pilot',
] as const;
export type N06Capability = typeof N06_CAPABILITIES[number];
export const N06_PEER = 'N06' as const;
export const N06_ROUTE_COUNT = 10;

export function createN06Request(capability: N06Capability | string, payload: unknown): SoulMeshMessage {
  const correlationId = crypto.randomUUID();
  return { protocol:'soul-mesh/1', id:crypto.randomUUID(), correlationId, source:'N05', target:N06_PEER, kind:'request', capability, payload, timestamp:Date.now() };
}

export function validateN06Response(request: SoulMeshMessage, response: unknown): response is SoulMeshMessage {
  if (!response || typeof response !== 'object') return false;
  const value = response as SoulMeshMessage;
  return value.protocol === request.protocol && value.correlationId === request.correlationId && value.source === 'N06' && value.target === 'N05' && (value.kind === 'response' || value.kind === 'error');
}
