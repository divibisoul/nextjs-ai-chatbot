export const SOUL_MESH_PEERS = ['aeternum','nexus','eternium','chatbots','chatbot-2000'] as const;
export type SoulMeshPeer = typeof SOUL_MESH_PEERS[number];
export type SoulMeshRoute = { source: 'chatbot'; target: SoulMeshPeer; direction: 'out' } | { source: SoulMeshPeer; target: 'chatbot'; direction: 'in' };
export const R4_IN: SoulMeshRoute[] = SOUL_MESH_PEERS.map((source) => ({ source, target: 'chatbot' as const, direction: 'in' as const }));
export const R4_OUT: SoulMeshRoute[] = SOUL_MESH_PEERS.map((target) => ({ source: 'chatbot' as const, target, direction: 'out' as const }));
export const R4_IO = [...R4_IN, ...R4_OUT];
