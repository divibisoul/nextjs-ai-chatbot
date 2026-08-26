import { SOUL_MESH_PEERS, type SoulNucleusId } from './SoulMeshTopology';

export const NUCLEUS_ID: SoulNucleusId = 'N04';
export type SoulMeshRoute =
  | { source: SoulNucleusId; target: SoulNucleusId; direction: 'out' }
  | { source: SoulNucleusId; target: SoulNucleusId; direction: 'in' };

const peers = SOUL_MESH_PEERS[NUCLEUS_ID];
export const R5_IN: SoulMeshRoute[] = peers.map((source) => ({ source, target: NUCLEUS_ID, direction: 'in' }));
export const R5_OUT: SoulMeshRoute[] = peers.map((target) => ({ source: NUCLEUS_ID, target, direction: 'out' }));
export const R5_IO = [...R5_IN, ...R5_OUT] as const;
