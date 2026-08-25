import type { SoulNucleus } from './SoulMeshProtocol';

export const SOUL_MESH_NUCLEI: readonly SoulNucleus[] = [
  'aeternum',
  'nexus',
  'eternium',
  'chatbot',
  'chatbots',
  'chatbot-2000',
] as const;

export function getSoulMeshPeers(local: SoulNucleus): SoulNucleus[] {
  return SOUL_MESH_NUCLEI.filter((nucleus) => nucleus !== local);
}

export function assertFivePeers(local: SoulNucleus): void {
  const peers = getSoulMeshPeers(local);
  if (peers.length !== 5) throw new Error(`Soul Mesh topology requires 5 peers; ${local} has ${peers.length}`);
}
