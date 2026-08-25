export type SoulMeshHealth = {
  nodeId: string;
  connected: boolean;
  lastSeenAt: string | null;
};

export function createSoulMeshHealth(nodeId: string): SoulMeshHealth {
  return { nodeId, connected: false, lastSeenAt: null };
}
