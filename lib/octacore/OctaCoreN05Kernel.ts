import { createN05CapabilityGateway } from '@/src/mesh/N05Capabilities';
import type { SoulNucleus } from '@/lib/soul-mesh/endpoint';

export interface OctaCoreN05Request {
  capability: string;
  payload: unknown;
  job_id?: string;
  correlation_id: string;
  source: SoulNucleus;
}

export async function executeOctaCoreN05(request: OctaCoreN05Request) {
  if (!request || typeof request !== 'object') {
    throw new Error('OCTACORE_N05_REQUEST_REQUIRED');
  }

  const capability = request.capability?.trim();
  if (!capability) throw new Error('OCTACORE_N05_CAPABILITY_REQUIRED');

  const gateway = createN05CapabilityGateway();
  if (!gateway.has(capability)) {
    throw new Error(`OCTACORE_N05_CAPABILITY_NOT_EXECUTABLE:${capability}`);
  }

  const result = await gateway.execute({
    id: request.job_id ?? request.correlation_id,
    correlationId: request.correlation_id,
    traceId: request.correlation_id,
    contractVersion: '1.1.0',
    source: request.source,
    target: 'N05',
    capability,
    payload: request.payload,
    timestamp: Date.now(),
  });

  if (result.status !== 'ok') {
    throw new Error(
      `OCTACORE_N05_EXECUTION_ERROR:${result.error?.code ?? 'UNKNOWN'}:${result.error?.message ?? 'Execution failed'}`,
    );
  }

  return {
    ok: true,
    nucleus: 'N05' as const,
    capability,
    job_id: request.job_id ?? null,
    correlation_id: request.correlation_id,
    result: result.result,
  };
}
