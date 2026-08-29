import { createHmac, randomUUID } from 'node:crypto';
import { canConsume, ownershipFor, type N05Nucleus } from './N05OwnershipMatrix';
import { sendToNucleus } from '../../lib/soul-mesh/adapter';

type Handler = (request: MeshRequest) => Promise<unknown> | unknown;
export type MeshRequest = { id?: string; correlationId?: string; source: N05Nucleus; target: 'N05'; capability: string; payload: unknown; timestamp?: number; nonce?: string };
export type MeshResponse = { id: string; correlationId: string; source: 'N05'; target: N05Nucleus; capability: string; status: 'ok' | 'error'; result?: unknown; error?: { code: string; message: string } };

export class N05MeshGateway {
  private readonly handlers = new Map<string, Handler>();
  register(capability: string, handler: Handler, ownership: { owner: N05Nucleus; consumers: N05Nucleus[] }) {
    if (!capability || typeof handler !== 'function') throw new TypeError('Invalid capability handler');
    if (ownership.owner !== 'N05' || !ownership.consumers.includes('N01')) throw new Error('Invalid N05 ownership declaration');
    this.handlers.set(capability, handler);
  }
  async execute(request: MeshRequest): Promise<MeshResponse> {
    const id = request.id ?? randomUUID();
    const correlationId = request.correlationId ?? randomUUID();
    const rule = ownershipFor(request.capability);
    if (!rule || !canConsume(request.source, request.capability)) return { id, correlationId, source: 'N05', target: request.source, capability: request.capability, status: 'error', error: { code: 'CAPABILITY_FORBIDDEN', message: 'Source is not an authorized consumer' } };
    if (rule.owner !== 'N05') {
      const candidates = [rule.owner, ...(rule.fallback ?? [])].filter((value, index, all) => all.indexOf(value) === index && value !== 'N05');
      let lastError: unknown;
      for (const target of candidates) {
        try {
          const result = await sendToNucleus(target as Exclude<N05Nucleus, 'N05'>, request.capability, request.payload, 30000);
          return { id, correlationId, source: 'N05', target: request.source, capability: request.capability, status: 'ok', result };
        } catch (error) { lastError = error; }
      }
      return { id, correlationId, source: 'N05', target: request.source, capability: request.capability, status: 'error', error: { code: 'CAPABILITY_DELEGATION_FAILED', message: lastError instanceof Error ? lastError.message : String(lastError ?? 'No owner/fallback reachable') } };
    }
    const handler = this.handlers.get(request.capability);
    if (!handler) return { id, correlationId, source: 'N05', target: request.source, capability: request.capability, status: 'error', error: { code: 'CAPABILITY_NOT_IMPLEMENTED', message: `No handler registered for ${request.capability}` } };
    try { return { id, correlationId, source: 'N05', target: request.source, capability: request.capability, status: 'ok', result: await handler(request) }; }
    catch (error) { return { id, correlationId, source: 'N05', target: request.source, capability: request.capability, status: 'error', error: { code: 'CAPABILITY_EXECUTION_FAILED', message: error instanceof Error ? error.message : String(error) } }; }
  }
}
export function signMeshPayload(payload: string, secret: string) { return createHmac('sha256', secret).update(payload).digest('hex'); }
