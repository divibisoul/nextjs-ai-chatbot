import crypto from 'node:crypto';
import { executeSoulInference } from './SoulMeshAI';
import { geminiCodeExecution, geminiEmbed, geminiGoogleSearch, geminiUrlContext } from '@/lib/gemini/GeminiToolset';
import { N05MeshGateway, type N05CapabilityHandler, type N05GatewayRequest, type N05GatewayResponse } from './N05MeshGateway';
import { delegateN05ExternalCapability } from '@/src/mesh/N05ExternalCapabilityBridge';

export type { N05CapabilityHandler };

/** N05 runtime with a single executable boundary for Soul Mesh calls. */
export class Nucleus05Runtime {
  private readonly gateway: N05MeshGateway;

  constructor(gateway = new N05MeshGateway()) {
    this.gateway = gateway;
  }

  register(capability: string, handler: N05CapabilityHandler): this {
    this.gateway.register(capability, handler);
    return this;
  }

  registerMany(handlers: Record<string, N05CapabilityHandler>): this {
    this.gateway.registerMany(handlers);
    return this;
  }

  has(capability: string): boolean { return this.gateway.has(capability); }
  list(): string[] { return this.gateway.list(); }

  async execute(capability: string, payload: unknown): Promise<unknown> {
    const response = await this.gateway.execute({
      capability,
      payload,
      source: 'N05',
      correlationId: crypto.randomUUID(),
      timestamp: Date.now(),
      nonce: crypto.randomUUID(),
    });
    if (!response.ok) throw new Error(`${response.error?.code ?? 'CAPABILITY_EXECUTION_FAILED'}:${response.error?.message ?? capability}`);
    return response.result;
  }

  async executeMesh(request: N05GatewayRequest): Promise<N05GatewayResponse> {
    return this.gateway.execute(request);
  }

  describe() {
    return { nucleus: 'N05', executableCapabilities: this.list(), meshBoundary: 'N05MeshGateway' };
  }
}

export function createNucleus05Runtime(extra: Record<string, N05CapabilityHandler> = {}) {
  return new Nucleus05Runtime().registerMany({
    'external-capability-execution': async (payload) => {
      if (!payload || typeof payload !== 'object') throw new TypeError('N05_EXTERNAL_CAPABILITY_PAYLOAD_REQUIRED');
      const input = payload as Record<string, unknown>;
      return delegateN05ExternalCapability({
        capability: String(input.capability ?? ''),
        payload: input.payload,
        correlationId: String(input.correlationId ?? crypto.randomUUID()),
        traceId: typeof input.traceId === 'string' ? input.traceId : undefined,
        workloads: Array.isArray(input.workloads) ? input.workloads : [],
        candidate: input.candidate && typeof input.candidate === 'object' ? input.candidate as Record<string, unknown> : { capability: String(input.capability ?? '') },
        strategy: typeof input.strategy === 'string' ? input.strategy : undefined,
      });
    },
    'ai.infer': executeSoulInference,
    conversation: executeSoulInference,
    'gemini.google_search': async (payload) => {
      if (!payload || typeof payload !== 'object') throw new TypeError('GEMINI_SEARCH_PAYLOAD_REQUIRED');
      const query = (payload as Record<string, unknown>).query;
      if (typeof query !== 'string') throw new TypeError('GEMINI_SEARCH_QUERY_REQUIRED');
      return geminiGoogleSearch(query);
    },
    'gemini.code_execution': async (payload) => {
      if (!payload || typeof payload !== 'object') throw new TypeError('GEMINI_CODE_PAYLOAD_REQUIRED');
      const instruction = (payload as Record<string, unknown>).instruction;
      if (typeof instruction !== 'string') throw new TypeError('GEMINI_CODE_INSTRUCTION_REQUIRED');
      return geminiCodeExecution(instruction);
    },
    'gemini.url_context': async (payload) => {
      if (!payload || typeof payload !== 'object') throw new TypeError('GEMINI_URL_PAYLOAD_REQUIRED');
      const input = payload as Record<string, unknown>;
      const urls = Array.isArray(input.urls) ? input.urls.filter((value): value is string => typeof value === 'string') : [];
      if (urls.length === 0 || typeof input.question !== 'string') throw new TypeError('GEMINI_URL_CONTEXT_INPUT_REQUIRED');
      return geminiUrlContext(urls, input.question);
    },
    'gemini.embed': async (payload) => {
      if (!payload || typeof payload !== 'object') throw new TypeError('GEMINI_EMBED_PAYLOAD_REQUIRED');
      const value = (payload as Record<string, unknown>).text;
      if (typeof value !== 'string') throw new TypeError('GEMINI_EMBED_TEXT_REQUIRED');
      return geminiEmbed(value);
    },
    ...extra,
  });
}
