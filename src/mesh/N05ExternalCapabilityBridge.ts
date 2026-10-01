import { n05PeerMeshBridge } from './N05PeerMeshBridge';

export type N05ExternalCapabilityRequest = {
  capability: string;
  payload?: unknown;
  correlationId: string;
  traceId?: string;
  workloads?: unknown[];
  candidate?: Record<string, unknown>;
  strategy?: string;
};

export async function delegateN05ExternalCapability(
  request: N05ExternalCapabilityRequest,
): Promise<unknown> {
  const capability = request.capability.trim();
  if (!capability) throw new Error('N05_EXTERNAL_CAPABILITY_REQUIRED');
  const correlationId = request.correlationId.trim();
  if (!correlationId) throw new Error('N05_EXTERNAL_CORRELATION_REQUIRED');

  const result = await n05PeerMeshBridge.request(
    'N02',
    capability,
    {
      payload: request.payload ?? {},
      metadata: {
        prefrontal_orbital: 'true',
        workloads_json: JSON.stringify(request.workloads ?? []),
        candidate_json: JSON.stringify(request.candidate ?? { capability }),
        strategy: request.strategy ?? 'n05-external-tool-preflight',
      },
    },
    correlationId,
    request.traceId?.trim() || correlationId,
  );
  return result.payload;
}
