export const SOUL_NUCLEI = ['N01', 'N02', 'N03', 'N04', 'N05', 'N06'] as const;
export type SoulNucleusId = (typeof SOUL_NUCLEI)[number];

export const SOUL_MESH_PEERS: Record<SoulNucleusId, readonly SoulNucleusId[]> = {
  N01: ['N02', 'N03', 'N04', 'N05', 'N06'],
  N02: ['N01', 'N03', 'N04', 'N05', 'N06'],
  N03: ['N01', 'N02', 'N04', 'N05', 'N06'],
  N04: ['N01', 'N02', 'N03', 'N05', 'N06'],
  N05: ['N01', 'N02', 'N03', 'N04', 'N06'],
  N06: ['N01', 'N02', 'N03', 'N04', 'N05'],
};

export const SOUL_AFFINITY = {
  N01: { group: 'runtime-foundation', priority: 0 },
  N03: { group: 'perception-context', priority: 1 },
  N02: { group: 'conversation-interaction', priority: 2 },
  N04: { group: 'tools-artifacts', priority: 2 },
  N05: { group: 'orchestration-execution', priority: 3 },
  N06: { group: 'cognition-governance', priority: 4 },
} as const;

export type SoulMeshPortDirection = 'in' | 'out';
export type SoulMeshPort = { owner: SoulNucleusId; peer: SoulNucleusId; direction: SoulMeshPortDirection; slot: 1 | 2 | 3 | 4 | 5 };

export function getPeerPorts(owner: SoulNucleusId): SoulMeshPort[] {
  return SOUL_MESH_PEERS[owner].map((peer, index) => ({ owner, peer, direction: 'out', slot: (index + 1) as SoulMeshPort['slot'] }));
}

export function getInboundPorts(owner: SoulNucleusId): SoulMeshPort[] {
  return SOUL_MESH_PEERS[owner].map((peer, index) => ({ owner, peer, direction: 'in', slot: (index + 1) as SoulMeshPort['slot'] }));
}

export function isValidNucleus(id: string): id is SoulNucleusId {
  return (SOUL_NUCLEI as readonly string[]).includes(id);
}
