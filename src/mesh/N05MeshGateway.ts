import { createHmac, randomUUID } from 'node:crypto';
import { canConsume, ownershipFor, type N05Nucleus } from './N05OwnershipMatrix';
import { n05CircuitBreaker, withN05Retry } from './N05Resilience';

type Handler = (request: MeshRequest) => Promise<unknown> | unknown;
export type MeshRequest = { id?: string; correlationId?: string; source: N05Nucleus; target: 'N05'; capability: string; payload: unknown; timestamp?: number; nonce?: string };
export type MeshResponse = { id: string; correlationId: string; source: 'N05'; target: N05Nucleus; capability: string; status: 'ok' | 'error'; result?: unknown; error?: { code: string; message: string } };

function ownershipCapability(capability: string): string {
  if (capability === 'ai.infer') return 'inference.';
  if (capability === 'conversation') return 'conversation.';
  if (capability === 'document-processing') return 'document.';
  if (capability === 'artifact-processing') return 'document.';
  if (capability === 'tool-execution') return 'tool.';
  return capability;
}

export class N05MeshGateway {
  private readonly handlers = new Map<string, Handler>();
  register(capability: string, handler: Handler, ownership: { owner: N05Nucleus; consumers: N05Nucleus[] }) {
    if (!capability || typeof handler !== 'function') throw new TypeError('Invalid capability handler');
    if (ownership.owner !== 'N05') throw new Error('Invalid N05 ownership declaration');
    this.handlers.set(capability, handler);
  }
  async execute(request: MeshRequest): Promise<MeshResponse> {
    const id = request.id ?? randomUUID();
    const correlationId = request.correlationId ?? randomUUID();
    const ownershipKey = ownershipCapability(request.capability);
    const rule = ownershipFor(ownershipKey);
    if (!rule || !canConsume(request.source, ownershipKey)) return { id, correlationId, source: 'N05', target: request.source, capability: request.capability, status: 'error', error: { code: 'CAPABILITY_FORBIDDEN', message: 'Source is not an authorized consumer' } };
    if (rule.owner !== 'N05') {
      const { sendToNucleus } = await import('../../lib/soul-mesh/adapter');
      const candidates = [rule.owner, ...(rule.fallback ?? [])].filter((value, index, all) => all.indexOf(value) === index && value !== 'N05');
      let lastError: unknown;
      for (const target of candidates) {
        try {
          const result = await withN05Retry(() => sendToNucleus(target as Exclude<N05Nucleus, 'N05'>, request.capability, request.payload, 30000), target, { retries: 2, breaker: n05CircuitBreaker });
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
