import type { SoulNucleus } from './SoulMeshProtocol';

export const SOUL_MESH_NUCLEI: readonly SoulNucleus[] = [
  'aeternum',
  'nexus',
  'eternium',
  'chatbot',
  'chatbots',
  'chatbot-2000',
] as const;

export type SoulDirectedLink = Readonly<{ source: SoulNucleus; target: SoulNucleus }>;

export function getSoulMeshPeers(local: SoulNucleus): SoulNucleus[] {
  return SOUL_MESH_NUCLEI.filter((nucleus) => nucleus !== local);
}

export function getSoulDirectedLinks(): SoulDirectedLink[] {
  return SOUL_MESH_NUCLEI.flatMap((source) =>
    getSoulMeshPeers(source).map((target) => ({ source, target })),
  );
}

export function assertFivePeers(local: SoulNucleus): void {
  const peers = getSoulMeshPeers(local);
  if (peers.length !== 5) throw new Error(`Soul Mesh topology requires 5 peers; ${local} has ${peers.length}`);
}

export function assertCompleteSoulTopology(): void {
  if (SOUL_MESH_NUCLEI.length !== 6) throw new Error(`Soul Mesh requires 6 nuclei; found ${SOUL_MESH_NUCLEI.length}`);
  const links = getSoulDirectedLinks();
  if (links.length !== 30) throw new Error(`Soul Mesh requires 30 directed links; found ${links.length}`);
  for (const nucleus of SOUL_MESH_NUCLEI) {
    const outgoing = links.filter((link) => link.source === nucleus).length;
    const incoming = links.filter((link) => link.target === nucleus).length;
    if (outgoing !== 5 || incoming !== 5) {
      throw new Error(`Invalid topology for ${nucleus}: expected 5 IN and 5 OUT, got ${incoming} IN / ${outgoing} OUT`);
    }
  }
}
