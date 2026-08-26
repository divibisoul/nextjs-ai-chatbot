import type { SoulMeshMessage } from './SoulMeshProtocol';
import { isValidNucleus } from './SoulMeshTopology';

export const NUCLEUS_ID = 'N04' as const;
export const SOUL_MESH_PROTOCOL = 'soul-mesh/1' as const;

export function validateMeshMessage(message: SoulMeshMessage) {
  if (message.protocol !== SOUL_MESH_PROTOCOL) throw new Error('UNSUPPORTED_MESH_PROTOCOL');
  if (!message.id || !message.correlationId) throw new Error('MISSING_MESSAGE_ID');
  if (!isValidNucleus(message.source) || !isValidNucleus(message.target) || message.source === message.target) throw new Error('INVALID_NUCLEUS_ROUTE');
  if (!message.capability && message.kind !== 'event') throw new Error('MISSING_CAPABILITY');
  if (message.target !== NUCLEUS_ID) throw new Error('WRONG_TARGET');
  return true;
}

export async function handleMeshMessage(message: SoulMeshMessage, handlers: Record<string, (payload: unknown) => Promise<unknown> | unknown>) {
  validateMeshMessage(message);
  if (message.kind !== 'request') return message;
  const handler = message.capability ? handlers[message.capability] : undefined;
  if (!handler) return { ...message, kind: 'error' as const, payload: { code: 'CAPABILITY_NOT_FOUND' } };
  try {
    return { ...message, kind: 'response' as const, payload: await handler(message.payload) };
  } catch (error) {
    return { ...message, kind: 'error' as const, payload: { code: 'CAPABILITY_EXECUTION_ERROR', detail: error instanceof Error ? error.message : 'Unknown error' } };
  }
}
