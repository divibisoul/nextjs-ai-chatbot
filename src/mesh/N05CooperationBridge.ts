import { n05PeerMeshBridge } from './N05PeerMeshBridge';

export type N05CooperationRequest = {
  target: 'N01' | 'N02' | 'N03' | 'N04' | 'N06' | 'N07';
  requiredCapability?: string;
  capability?: string;
  payload?: unknown;
  correlationId?: string;
  traceId?: string;
};

/**
 * Uses the existing N05 Mesh bridge as the only transport.
 * N07 remains the owner of cooperative discovery, negotiation and route learning.
 */
export async function n05CooperationHandshake(
  request: N05CooperationRequest,
): Promise<unknown> {
  const target = request.target?.trim() as N05CooperationRequest['target'];
  if (!target) throw new Error('N05_COOPERATION_TARGET_REQUIRED');

  const correlationId = request.correlationId?.trim() || crypto.randomUUID();
  const traceId = request.traceId?.trim() || correlationId;

  const result = await n05PeerMeshBridge.request(
    'N07',
    'cooperation.handshake',
    {
      target,
      required_capability: request.requiredCapability?.trim() || '',
    },
    correlationId,
    traceId,
  );
  return (result.payload as { payload?: unknown })?.payload ?? result.payload;
}

export async function n05CooperationExchange(
  request: N05CooperationRequest,
): Promise<unknown> {
  const target = request.target?.trim() as N05CooperationRequest['target'];
  const capability = request.capability?.trim();
  if (!target) throw new Error('N05_COOPERATION_TARGET_REQUIRED');
  if (!capability) throw new Error('N05_COOPERATION_CAPABILITY_REQUIRED');

  const correlationId = request.correlationId?.trim() || crypto.randomUUID();
  const traceId = request.traceId?.trim() || correlationId;

  const result = await n05PeerMeshBridge.request(
    'N07',
    'cooperation.exchange',
    {
      target,
      capability,
      payload: request.payload ?? {},
    },
    correlationId,
    traceId,
  );
  return (result.payload as { payload?: unknown })?.payload ?? result.payload;
}
