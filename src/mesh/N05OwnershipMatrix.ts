export type N05Nucleus = 'N1'|'N2'|'N3'|'N4'|'N5'|'N6';
export type OwnershipRule = { owner:N05Nucleus; consumers:N05Nucleus[]; fallback?:N05Nucleus };
export const N05_OWNERSHIP: Record<string,OwnershipRule> = {
  'inference.': { owner:'N5', consumers:['N1','N2','N4','N6'], fallback:'N2' },
  'conversation.': { owner:'N5', consumers:['N1','N6'], fallback:'N2' },
  'document.': { owner:'N4', consumers:['N1','N5','N6'], fallback:'N6' },
  'audio.': { owner:'N3', consumers:['N1','N2'], fallback:'N1' },
  'tool.': { owner:'N4', consumers:['N1','N5','N6'], fallback:'N6' },
};
export function ownershipFor(capability:string){ return Object.entries(N05_OWNERSHIP).find(([prefix])=>capability.startsWith(prefix))?.[1]; }
export function canConsume(source:N05Nucleus, capability:string){ const rule=ownershipFor(capability); return !!rule && (rule.owner===source || rule.consumers.includes(source)); }
