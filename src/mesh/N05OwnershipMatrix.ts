export type N05Nucleus = 'N01'|'N02'|'N03'|'N04'|'N05'|'N06';
export type OwnershipRule = { owner:N05Nucleus; consumers:N05Nucleus[]; fallback?:N05Nucleus[] };

// Unified Soul authority. N05 remains an executable fallback for inference/conversation.
export const N05_OWNERSHIP: Record<string,OwnershipRule> = {
  'inference.': { owner:'N02', consumers:['N01','N04','N06'], fallback:['N05'] },
  'conversation.': { owner:'N02', consumers:['N01','N06'], fallback:['N05'] },
  'document.': { owner:'N04', consumers:['N01','N05','N06'], fallback:['N06'] },
  'audio.': { owner:'N03', consumers:['N01','N02'], fallback:['N01'] },
  'speech.': { owner:'N03', consumers:['N01','N02','N05','N06'], fallback:['N01'] },
  'cognitive.': { owner:'N06', consumers:['N01','N02','N04','N05'], fallback:['N05','N02'] },
  'tool.': { owner:'N04', consumers:['N01','N05','N06'], fallback:['N06'] },
};

export function ownershipFor(capability:string){return Object.entries(N05_OWNERSHIP).find(([prefix])=>capability.startsWith(prefix))?.[1];}
export function canConsume(source:N05Nucleus, capability:string){const rule=ownershipFor(capability);return !!rule&&(rule.owner===source||rule.consumers.includes(source));}
