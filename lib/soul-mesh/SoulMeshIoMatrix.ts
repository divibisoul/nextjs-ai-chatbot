export const SOUL_MESH_PEERS = ['N01','N02','N03','N04','N06'] as const;
export type SoulMeshPeer = typeof SOUL_MESH_PEERS[number];
export type SoulMeshRoute = { source: 'N05'; target: SoulMeshPeer; direction: 'out' } | { source: SoulMeshPeer; target: 'N05'; direction: 'in' };
export const R4_IN: SoulMeshRoute[] = SOUL_MESH_PEERS.map((source) => ({ source, target: 'N05' as const, direction: 'in' as const }));
export const R4_OUT: SoulMeshRoute[] = SOUL_MESH_PEERS.map((target) => ({ source: 'N05' as const, target, direction: 'out' as const }));
export const R4_IO = [...R4_IN, ...R4_OUT];
