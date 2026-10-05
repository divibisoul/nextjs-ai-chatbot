import type { N05MeshGateway } from './N05MeshGateway';
import type { SoulMeshMessage } from './endpoint';

/**
 * N05 ingress guard:
 * - correlation header may be omitted by legacy callers, but when present it
 *   must match the canonical request correlationId exactly;
 * - only capabilities registered by the executable N05 gateway may enter the
 *   generic execution boundary.
 */
export function validateN05CorrelationHeader(request: Request, message: SoulMeshMessage): void {
  const header = request.headers.get('x-soul-correlation-id')?.trim();
  if (header && header !== message.correlationId) {
    throw new Error('CORRELATION_ID_MISMATCH');
  }
}

export function isN05ExecutableCapability(gateway: Pick<N05MeshGateway, 'has'>, capability: string): boolean {
  return Boolean(capability.trim()) && gateway.has(capability);
}
