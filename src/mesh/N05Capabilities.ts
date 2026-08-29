import { N05MeshGateway } from './N05MeshGateway';
import { N05_OWNERSHIP } from './N05OwnershipMatrix';
import { N05InferenceCache } from './N05InferenceCache';
import { n05InferencePool } from './N05InferencePool';
import { N05AgentRegistry } from './N05AgentRegistry';
import type { N05Agent } from './N05AgentContract';
import type { SoulInferenceRequest } from '@/lib/soul-mesh/SoulMeshAI';

const systems: Record<string, string> = {
  'inference.reason': 'You are N05, the Soul inference engine. Reason precisely and return only the requested reasoning.',
  'inference.analyze': 'You are N05, a stateless analysis engine. Analyze the supplied input rigorously.',
  'inference.summarize': 'You are N05, a concise summarization engine. Preserve essential meaning.',
  'inference.translate': 'You are N05, a translation engine. Preserve meaning, tone and structure.',
  'inference.classify': 'You are N05, a classification engine. Return the most defensible classification with rationale.',
  'conversation.chat': 'You are N05, the Soul conversational inference engine. Use supplied conversational context.',
  'conversation.memory': 'You are N05, the Soul conversational memory processor. Extract and organize durable context.',
};

function payloadToRequest(payload: unknown, system?: string): SoulInferenceRequest {
  if (typeof payload === 'string') return { prompt: payload, system, model: 'chat-model' };
  if (!payload || typeof payload !== 'object') throw new TypeError('N05_INFERENCE_PAYLOAD_REQUIRED');
  return { ...(payload as Partial<SoulInferenceRequest>), ...(system ? { system } : {}) } as SoulInferenceRequest;
}

export function createN05CapabilityGateway() {
  const gateway = new N05MeshGateway();
  const cache = new N05InferenceCache();
  const agents = new N05AgentRegistry();
  const inferenceCapabilities = ['ai.infer', ...Object.keys(systems)];
  const inferenceAgent: N05Agent = {
    id: 'N05-inference-agent',
    name: 'N05 Inference Agent',
    capabilities: inferenceCapabilities,
    execute: async (request) => {
      const system = systems[request.capability];
      const input = payloadToRequest(request.payload, system);
      if (request.capability === 'ai.infer' || request.capability.startsWith('conversation.')) return n05InferencePool.run(input, request.source === 'N01' ? 100 : 50);
      const cached = cache.get(input);
      if (cached !== undefined) return cached;
      const result = await n05InferencePool.run(input, request.source === 'N01' ? 100 : 50);
      cache.set(input, result);
      return result;
    },
  };
  agents.register(inferenceAgent);
  for (const capability of inferenceCapabilities) {
    const ownership = capability.startsWith('conversation.') ? N05_OWNERSHIP['conversation.'] : N05_OWNERSHIP['inference.'];
    gateway.register(capability, (request) => agents.execute(request), ownership);
  }
  return gateway;
}
