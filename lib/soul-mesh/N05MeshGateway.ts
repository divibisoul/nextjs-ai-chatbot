import { canConsume, soulCapability, type SoulCapability } from './capabilities';
import type { SoulNucleus } from './SoulMeshProtocol';
import { ownershipRule } from './N05OwnershipMatrix';

export type N05CapabilityHandler = (payload: unknown) => unknown | Promise<unknown>;

export interface N05GatewayRequest {
  capability: string;
  payload: unknown;
  source: SoulNucleus;
  correlationId: string;
}

export interface N05GatewayResponse {
  ok: boolean;
  source: 'N05';
  target: SoulNucleus;
  capability: string;
  correlationId: string;
  result?: unknown;
  error?: { code: string; message: string; fallback?: readonly SoulNucleus[] };
}

export class N05MeshGateway {
  private readonly handlers = new Map<string, N05CapabilityHandler>();

  register(capability: string, handler: N05CapabilityHandler, ownership?: Partial<SoulCapability>): this {
    if (!capability.trim()) throw new Error('N05_CAPABILITY_ID_REQUIRED');
    if (typeof handler !== 'function') throw new Error(`N05_HANDLER_INVALID:${capability}`);
    const declared = soulCapability(capability);
    const rule = ownershipRule(capability);
    const owner = ownership?.owner ?? declared?.owner ?? rule?.owner;
    if (owner && owner !== 'N05') throw new Error(`N05_NOT_OWNER:${capability}:${owner}`);
    this.handlers.set(capability, handler);
    return this;
  }

  registerMany(handlers: Record<string, N05CapabilityHandler>): this {
    for (const [capability, handler] of Object.entries(handlers)) this.register(capability, handler);
    return this;
  }

  has(capability: string): boolean { return this.handlers.has(capability); }
  list(): string[] { return [...this.handlers.keys()].sort(); }

  async execute(request: N05GatewayRequest): Promise<N05GatewayResponse> {
    const { capability, payload, source, correlationId } = request;
    if (!canConsume(capability, source)) {
      const rule = ownershipRule(capability);
      return {
        ok: false, source: 'N05', target: source, capability, correlationId,
        error: { code: 'CAPABILITY_SOURCE_NOT_AUTHORIZED', message: `Source ${source} is not authorized for ${capability}`, fallback: rule?.fallback },
      };
    }

    const handler = this.handlers.get(capability);
    if (!handler) {
      const rule = ownershipRule(capability);
      return {
        ok: false, source: 'N05', target: source, capability, correlationId,
        error: { code: 'CAPABILITY_NOT_IMPLEMENTED', message: `N05 has no executable handler for ${capability}`, fallback: rule?.fallback },
      };
    }

    try {
      const result = await handler(payload);
      return { ok: true, source: 'N05', target: source, capability, correlationId, result };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { ok: false, source: 'N05', target: source, capability, correlationId, error: { code: 'CAPABILITY_EXECUTION_FAILED', message } };
    }
  }
}
