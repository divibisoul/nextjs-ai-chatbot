import crypto from 'node:crypto';
import { executeSoulInference, soulInferenceCapabilities } from './SoulMeshAI';
import { SOUL_MESH_CAPABILITIES } from './SoulMeshCapabilities';
import { createNucleus05Runtime, type N05CapabilityHandler } from './Nucleus05Runtime';
import { createN05CapabilityGateway } from '../../src/mesh/N05Capabilities';

export const NUCLEUS_ID = 'N05' as const;
export const SOUL_MESH_PROTOCOL = 'soul-mesh/1' as const;
export const SOUL_MESH_CONTRACT_VERSION = '1.1.0' as const;
export type SoulNucleus = 'N01'|'N02'|'N03'|'N04'|'N05'|'N06';
export type NucleusId = SoulNucleus;
export type SoulMeshMessage = { protocol: typeof SOUL_MESH_PROTOCOL; contractVersion: typeof SOUL_MESH_CONTRACT_VERSION; id: string; correlationId: string; source: SoulNucleus; target: SoulNucleus; kind: 'request'|'response'|'event'|'error'; capability?: string; payload: unknown; timestamp: number; meta?: { runtime?: string; transport?: string; encoding?: string; version?: string; nonce?: string } };
const nuclei = new Set<SoulNucleus>(['N01','N02','N03','N04','N05','N06']);
const capabilityGateway = createN05CapabilityGateway();

export function validateMeshMessage(m: SoulMeshMessage) {
  if (m.protocol !== SOUL_MESH_PROTOCOL) throw new Error('UNSUPPORTED_MESH_PROTOCOL');
  if (m.contractVersion !== SOUL_MESH_CONTRACT_VERSION) throw new Error('UNSUPPORTED_MESH_CONTRACT_VERSION');
  if (!m.id || !m.correlationId) throw new Error('MISSING_MESSAGE_ID');
  if (!nuclei.has(m.source) || !nuclei.has(m.target) || m.source === m.target) throw new Error('INVALID_NUCLEUS_ROUTE');
  if (m.target !== NUCLEUS_ID) throw new Error('WRONG_TARGET');
  if (!['request','response','event','error'].includes(m.kind)) throw new Error('INVALID_MESSAGE_KIND');
  if (!m.capability && m.kind !== 'event') throw new Error('MISSING_CAPABILITY');
  if (!Number.isFinite(m.timestamp)) throw new Error('INVALID_TIMESTAMP');
  if (Math.abs(Date.now() - m.timestamp) > 5 * 60 * 1000) throw new Error('STALE_MESSAGE');
  return true;
}

function result(message: SoulMeshMessage, payload: unknown, kind: SoulMeshMessage['kind'] = 'response'): SoulMeshMessage {
  return { protocol: SOUL_MESH_PROTOCOL, contractVersion: SOUL_MESH_CONTRACT_VERSION, id: crypto.randomUUID(), correlationId: message.correlationId, source: NUCLEUS_ID, target: message.source, kind, capability: message.capability, payload, timestamp: Date.now(), meta: { runtime: 'nextjs-ai-chatbot', transport: 'http-json', encoding: 'json', version: SOUL_MESH_CONTRACT_VERSION, nonce: crypto.randomUUID() } };
}

export function createNucleus05MeshHandlers(extra: Record<string, N05CapabilityHandler> = {}) {
  const runtime = createNucleus05Runtime(extra);
  return { runtime, handlers: Object.fromEntries(runtime.list().map((capability) => [capability, (payload: unknown) => runtime.execute(capability, payload)])) };
}

export async function handleMeshMessage(message: SoulMeshMessage, handlers: Record<string, (payload: unknown) => Promise<unknown> | unknown> = {}) {
  validateMeshMessage(message);
  if (message.kind !== 'request') return message;
  if (message.capability === 'mesh.ping') return result(message, { ok: true, nucleus: NUCLEUS_ID, echoed: message.payload, processedAt: Date.now() });
  if (message.capability === 'mesh.describe') return result(message, { nucleus: NUCLEUS_ID, protocol: SOUL_MESH_PROTOCOL, contractVersion: SOUL_MESH_CONTRACT_VERSION, status: 'online', capabilities: SOUL_MESH_CAPABILITIES, executableCapabilities: createNucleus05Runtime(handlers).list(), models: soulInferenceCapabilities(), runtime: 'nextjs-ai-chatbot' });
  if (message.capability === 'core.health') return result(message, { ok: true, nucleus: NUCLEUS_ID, runtime: 'nextjs-ai-chatbot', aiProviderConfigured: Boolean(process.env.XAI_API_KEY), timestamp: Date.now() });
  try {
    const response = await capabilityGateway.execute({ id: message.id, correlationId: message.correlationId, source: message.source, target: 'N05', capability: message.capability ?? '', payload: message.payload, timestamp: message.timestamp, nonce: message.meta?.nonce });
    if (response.status === 'error') return result(message, { code: response.error?.code ?? 'CAPABILITY_EXECUTION_ERROR', nucleus: NUCLEUS_ID, capability: message.capability, detail: response.error?.message }, 'error');
    return result(message, response.result);
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown error';
    return result(message, { code: 'CAPABILITY_EXECUTION_ERROR', nucleus: NUCLEUS_ID, capability: message.capability, detail }, 'error');
  }
}
