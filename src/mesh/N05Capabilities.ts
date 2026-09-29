import { N05MeshGateway } from './N05MeshGateway';
import { N05_OWNERSHIP } from './N05OwnershipMatrix';
import { N05InferenceCache } from './N05InferenceCache';
import { n05InferencePool } from './N05InferencePool';
import { n05ModelRouter } from './N05ModelRouter';
import { N05AgentRegistry } from './N05AgentRegistry';
import type { N05Agent } from './N05AgentContract';
import type { SoulInferenceRequest } from '@/lib/soul-mesh/SoulMeshAI';
import { sendToNucleus } from '@/lib/soul-mesh/adapter';

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
  if (typeof payload === 'string') return { prompt: payload, system } as SoulInferenceRequest;
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
      const metadata = input.metadata ?? {};
      const route = n05ModelRouter.route({
        requestedModel: input.model,
        complexity: metadata.n05_complexity ? Number(metadata.n05_complexity) : undefined,
        latencyTargetMs: metadata.n05_latency_target_ms ? Number(metadata.n05_latency_target_ms) : undefined,
        costWeight: metadata.n05_cost_weight ? Number(metadata.n05_cost_weight) : undefined,
        qualityWeight: metadata.n05_quality_weight ? Number(metadata.n05_quality_weight) : undefined,
      });
      const routedInput = {
        ...input,
        model: route.model,
        metadata: {
          ...metadata,
          n05_route_model: route.model,
          n05_route_score: String(route.score),
          n05_route_reason: route.reason,
        },
      };
      const isConversation = request.capability.startsWith('conversation.');
      const priority = request.source === 'N01' ? 100 : 50;

      // Stateless inference is safely cacheable. Conversation remains uncached
      // because its result depends on evolving context/history.
      if (!isConversation) {
        const cached = cache.get(routedInput);
        if (cached !== undefined) return cached;
        const result = await n05InferencePool.run(routedInput, priority);
        cache.set(routedInput, result);
        return result;
      }

      return n05InferencePool.run(routedInput, priority);
    },
  };
  agents.register(inferenceAgent);
  for (const capability of inferenceCapabilities) {
    const ownership = capability.startsWith('conversation.') ? N05_OWNERSHIP['conversation.'] : N05_OWNERSHIP['inference.'];
    gateway.register(capability, (request) => agents.execute(request), ownership);
  }

  const collaborationAgent: N05Agent = {
    id: 'N05-n06-collaboration-agent',
    name: 'N05 N06 Collaboration Agent',
    capabilities: ['support.ai-pilot'],
    execute: async (request) => sendToNucleus('N06', 'support.ai-pilot', request.payload),
  };
  agents.register(collaborationAgent);
  gateway.register('support.ai-pilot', (request) => agents.execute(request), N05_OWNERSHIP['support.']);

  return gateway;
}
