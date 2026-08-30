import { executeSoulInference } from './SoulMeshAI';
import { N05MeshGateway, type N05CapabilityHandler, type N05GatewayRequest, type N05GatewayResponse } from './N05MeshGateway';

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
    'ai.infer': executeSoulInference,
    conversation: executeSoulInference,
    ...extra,
  });
}
