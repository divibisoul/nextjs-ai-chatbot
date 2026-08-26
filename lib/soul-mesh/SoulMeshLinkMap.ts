import { SOUL_MESH_PEERS, type SoulMeshPeer } from './SoulMeshPeerMatrix';
export type SoulMeshLink = { local: 'N04'; peer: SoulMeshPeer; in: boolean; out: boolean };
export const R5_LINKS: SoulMeshLink[] = SOUL_MESH_PEERS.map((peer) => ({ local: 'N04', peer, in: true, out: true }));
