import { executeSoulInference } from './SoulMeshAI';

export type N05CapabilityHandler = (payload: unknown) => unknown | Promise<unknown>;

/**
 * Capability registry for N05. Existing application functions can be registered
 * without being rewritten or frozen. The Mesh only becomes an additional API.
 */
export class Nucleus05Runtime {
  private readonly handlers = new Map<string, N05CapabilityHandler>();

  register(capability: string, handler: N05CapabilityHandler): this {
    if (!capability.trim()) throw new Error('N05_CAPABILITY_ID_REQUIRED');
    this.handlers.set(capability, handler);
    return this;
  }

  registerMany(handlers: Record<string, N05CapabilityHandler>): this {
    for (const [capability, handler] of Object.entries(handlers)) this.register(capability, handler);
    return this;
  }

  has(capability: string): boolean {
    return this.handlers.has(capability);
  }

  list(): string[] {
    return [...this.handlers.keys()].sort();
  }

  async execute(capability: string, payload: unknown): Promise<unknown> {
    const handler = this.handlers.get(capability);
    if (!handler) throw new Error(`CAPABILITY_HANDLER_NOT_REGISTERED:${capability}`);
    return handler(payload);
  }

  describe() {
    return { nucleus: 'N05', executableCapabilities: this.list() };
  }
}

export function createNucleus05Runtime(extra: Record<string, N05CapabilityHandler> = {}) {
  return new Nucleus05Runtime().registerMany({
    'ai.infer': executeSoulInference,
    conversation: executeSoulInference,
    ...extra,
  });
}
