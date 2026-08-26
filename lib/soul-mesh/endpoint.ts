import type { SoulMeshMessage } from './SoulMeshProtocol';
import { isValidNucleus } from './SoulMeshTopology';

export const NUCLEUS_ID = 'N04' as const;
export const SOUL_MESH_PROTOCOL = 'soul-mesh/1' as const;

function validateChannelMetadata(message: SoulMeshMessage) {
  if (!message.channelId) return;
  const slotPattern = new RegExp(`^(?:${message.source}\\.OUT\\.[1-5]\\.${message.target}|${message.target}\\.IN\\.[1-5]\\.${message.source})$`);
  const legacyPattern = new RegExp(`^(?:${message.source}\\.OUT\\.${message.target}|${message.target}\\.IN\\.${message.source})$`);
  if (!slotPattern.test(message.channelId) && !legacyPattern.test(message.channelId)) throw new Error('INVALID_CHANNEL_ID');
}

export function validateMeshMessage(message: SoulMeshMessage) {
  if (message.protocol !== SOUL_MESH_PROTOCOL) throw new Error('UNSUPPORTED_MESH_PROTOCOL');
  if (!message.id || !message.correlationId) throw new Error('MISSING_MESSAGE_ID');
  if (!isValidNucleus(message.source) || !isValidNucleus(message.target) || message.source === message.target) throw new Error('INVALID_NUCLEUS_ROUTE');
  if (!message.capability && message.kind !== 'event') throw new Error('MISSING_CAPABILITY');
  if (message.target !== NUCLEUS_ID) throw new Error('WRONG_TARGET');
  validateChannelMetadata(message);
  return true;
}

export async function handleMeshMessage(message: SoulMeshMessage, handlers: Record<string, (payload: unknown) => Promise<unknown> | unknown>) {
  validateMeshMessage(message);
  if (message.kind !== 'request') return message;
  const handler = message.capability ? handlers[message.capability] : undefined;
  if (!handler) return { ...message, kind: 'error' as const, proof: 'CONNECTED' as const, payload: { code: 'CAPABILITY_NOT_FOUND' } };
  try {
    return { ...message, kind: 'response' as const, proof: 'EXECUTED' as const, payload: await handler(message.payload) };
  } catch (error) {
    return { ...message, kind: 'error' as const, proof: 'EXECUTED' as const, payload: { code: 'CAPABILITY_EXECUTION_ERROR', detail: error instanceof Error ? error.message : 'Unknown error' } };
  }
}
