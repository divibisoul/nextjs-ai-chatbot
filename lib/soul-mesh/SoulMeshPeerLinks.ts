export const SOUL_MESH_PEERS = ['aeternum','nexus','eternium','chatbots','chatbot-2000'] as const;
export type SoulMeshPeer = typeof SOUL_MESH_PEERS[number];
export const SOUL_MESH_IN = [...SOUL_MESH_PEERS];
export const SOUL_MESH_OUT = [...SOUL_MESH_PEERS];

export function canRoute(target: string): target is SoulMeshPeer {
  return (SOUL_MESH_PEERS as readonly string[]).includes(target);
}
