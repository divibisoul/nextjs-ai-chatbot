import type { SoulNucleus } from './protocol';

export interface SoulCapability {
  id: string;
  version: string;
  execution: 'native' | 'cognitive-runtime' | 'delegated';
  description: string;
}

export type SoulCapabilityHandler = (payload: unknown, context: {
  source: SoulNucleus;
  target: 'N05';
  correlationId: string;
}) => Promise<unknown> | unknown;

export class SoulCapabilityRegistry {
  private readonly capabilities = new Map<string, SoulCapability>();
  private readonly handlers = new Map<string, SoulCapabilityHandler>();

  register(capability: SoulCapability): void { this.capabilities.set(capability.id, capability); }
  registerHandler(id: string, handler: SoulCapabilityHandler): void { this.handlers.set(id, handler); }
  has(id: string): boolean { return this.capabilities.has(id); }
  canExecute(id: string): boolean { return this.capabilities.has(id) && this.handlers.has(id); }
  list(): SoulCapability[] { return [...this.capabilities.values()]; }
  async execute(id: string, payload: unknown, context: Parameters<SoulCapabilityHandler>[1]): Promise<unknown> {
    const handler = this.handlers.get(id);
    if (!handler) throw new Error(`CAPABILITY_HANDLER_NOT_REGISTERED:${id}`);
    return handler(payload, context);
  }
}

export function createN05CapabilityRegistry(): SoulCapabilityRegistry {
  const registry = new SoulCapabilityRegistry();
  registry.register({ id: 'mesh.ping', version: '1.0.0', execution: 'native', description: 'N05 liveness' });
  registry.register({ id: 'mesh.describe', version: '1.0.0', execution: 'native', description: 'N05 identity and capabilities' });
  registry.register({ id: 'capability.list', version: '1.0.0', execution: 'native', description: 'Discover N05 capabilities' });
  return registry;
}
