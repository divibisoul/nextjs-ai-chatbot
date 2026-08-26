import { SOUL_MESH_PEERS as TOPOLOGY_PEERS, type SoulNucleusId } from './SoulMeshTopology';

export const NUCLEUS_ID: SoulNucleusId = 'N04';
export const SOUL_MESH_PEERS = TOPOLOGY_PEERS[NUCLEUS_ID];
export type SoulMeshPeer = (typeof SOUL_MESH_PEERS)[number];
export type SoulMeshDirection = 'in' | 'out';
export type SoulMeshPeerRoute = { peer: SoulMeshPeer; direction: SoulMeshDirection; enabled: boolean; slot: 1 | 2 | 3 | 4 | 5 };

export const R5_PEER_ROUTES: SoulMeshPeerRoute[] = SOUL_MESH_PEERS.flatMap((peer, index) => {
  const slot = (index + 1) as SoulMeshPeerRoute['slot'];
  return [
    { peer, direction: 'in' as const, enabled: true, slot },
    { peer, direction: 'out' as const, enabled: true, slot },
  ];
});

export function peerRoutes(peer: SoulMeshPeer): SoulMeshPeerRoute[] {
  return R5_PEER_ROUTES.filter((route) => route.peer === peer);
}
