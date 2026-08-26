/** Transport-neutral logical channel contract for hybrid Soul runtimes. */
export const SOUL_HYBRID_TRANSPORTS = ['WEBVIEW_BRIDGE','LOOPBACK_HTTP','HTTP','REALTIME','IN_PROCESS'] as const;
export type SoulHybridTransportKind = typeof SOUL_HYBRID_TRANSPORTS[number];
export type SoulNucleusId = 'N01'|'N02'|'N03'|'N04'|'N05'|'N06';
export type SoulMeshDirection = 'in'|'out';
export type SoulMeshSlot = 1|2|3|4|5;
export type SoulHybridChannel = { id: string; source: SoulNucleusId; target: SoulNucleusId; direction: SoulMeshDirection; slot: SoulMeshSlot; transports: readonly SoulHybridTransportKind[] };
export const createHybridChannel = (source: SoulNucleusId,target: SoulNucleusId,direction: SoulMeshDirection,slot: SoulMeshSlot): SoulHybridChannel => {
  if (source === target) throw new Error('SELF_CHANNEL_NOT_ALLOWED');
  return { id: `${source}->${target}:${direction}:${slot}`, source, target, direction, slot, transports: SOUL_HYBRID_TRANSPORTS };
};
