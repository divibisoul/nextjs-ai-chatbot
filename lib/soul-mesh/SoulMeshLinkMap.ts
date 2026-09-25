import type { SoulMeshPeer } from './SoulMeshPeerMatrix';
export type SoulMeshLink = { local: 'N05'; peer: SoulMeshPeer; in: boolean; out: boolean };
export const R4_LINKS: SoulMeshLink[] = ['N01','N02','N03','N04','N06','N07'].map((peer) => ({ local: 'N05', peer: peer as SoulMeshPeer, in: true, out: true }));
