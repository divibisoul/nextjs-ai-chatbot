import type { SoulNucleus } from './SoulMeshProtocol';
import { SOUL_MESH_CAPABILITIES } from './SoulMeshCapabilities';
import { SOUL_MESH_PEERS } from './SoulMeshTransportContract';

/** Machine-readable declaration of N05's interoperability surface. */
export const N05_INTEROP_MANIFEST = {
  nucleus: 'N05' as SoulNucleus,
  protocol: 'soul-mesh/1' as const,
  peers: SOUL_MESH_PEERS.filter((peer) => peer !== 'N05'),
  inbound: true,
  outbound: true,
  capabilities: SOUL_MESH_CAPABILITIES.filter((capability) => capability.owner === 'N05').map((capability) => capability.id),
  remoteCapabilities: SOUL_MESH_CAPABILITIES.filter((capability) => capability.owner && capability.owner !== 'N05').map((capability) => capability.id),
  transportPolicy: 'provider-agnostic',
  executionPolicy: 'local-runtime-or-explicit-remote-delegation',
};
