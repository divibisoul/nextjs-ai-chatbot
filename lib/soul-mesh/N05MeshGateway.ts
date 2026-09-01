import { randomUUID } from 'node:crypto';
import { N05MeshGateway as CanonicalN05MeshGateway, type MeshRequest as CanonicalMeshRequest, type MeshResponse as CanonicalMeshResponse } from '../../src/mesh/N05MeshGateway';
import type { SoulNucleus } from './SoulMeshProtocol';

export type N05CapabilityHandler = (payload: unknown) => unknown | Promise<unknown>;
export interface N05GatewayRequest extends Omit<CanonicalMeshRequest, 'target'> { target?: 'N05'; }
export interface N05GatewayResponse {
  ok: boolean;
  source: 'N05';
  target: SoulNucleus;
  capability: string;
  correlationId: string;
  traceId?: string;
  contractVersion: '1.1.0';
  result?: unknown;
  error?: { code: string; message: string; fallback?: readonly SoulNucleus[] };
}

/** Compatibility facade. The canonical execution implementation lives in src/mesh/N05MeshGateway. */
export class N05MeshGateway {
  private readonly canonical = new CanonicalN05MeshGateway();

  register(capability: string, handler: N05CapabilityHandler, ownership?: { owner?: SoulNucleus; consumers?: SoulNucleus[] }): this {
    this.canonical.register(capability, async request => handler(request.payload), {
      owner: (ownership?.owner ?? 'N05') as 'N05',
      consumers: ownership?.consumers ?? ['N01','N02','N03','N04','N05','N06'],
    });
    return this;
  }

  registerMany(handlers: Record<string, N05CapabilityHandler>): this {
    for (const [capability, handler] of Object.entries(handlers)) this.register(capability, handler);
    return this;
  }

  has(capability: string): boolean { return this.canonical.has(capability); }
  list(): string[] { return this.canonical.list(); }

  async execute(request: N05GatewayRequest): Promise<N05GatewayResponse> {
    const canonicalRequest: CanonicalMeshRequest = {
      id: request.id ?? randomUUID(),
      correlationId: request.correlationId ?? randomUUID(),
      traceId: request.traceId ?? randomUUID(),
      contractVersion: request.contractVersion ?? '1.1.0',
      source: request.source,
      target: 'N05',
      capability: request.capability,
      payload: request.payload,
      timestamp: request.timestamp ?? Date.now(),
      nonce: request.nonce,
      hmac: request.hmac,
    };
    const result: CanonicalMeshResponse = await this.canonical.execute(canonicalRequest);
    return {
      ok: result.status === 'ok',
      source: 'N05',
      target: request.source,
      capability: request.capability,
      correlationId: result.correlationId,
      traceId: result.traceId,
      contractVersion: result.contractVersion,
      ...(result.status === 'ok' ? { result: result.result } : { error: result.error }),
    };
  }
}
