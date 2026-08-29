export type N05Nucleus = 'N01'|'N02'|'N03'|'N04'|'N05'|'N06';
export type OwnershipRule = { owner:N05Nucleus; consumers:N05Nucleus[]; fallback?:N05Nucleus[] };

// Reconciled against the current peer implementations: N05 owns inference/conversation;
// N04 owns document; N03 owns audio/speech; N06 currently advertises tool/cognitive ownership.
export const N05_OWNERSHIP: Record<string,OwnershipRule> = {
  'inference.': { owner:'N05', consumers:['N01','N02','N04','N06'], fallback:['N02'] },
  'conversation.': { owner:'N05', consumers:['N01','N06'], fallback:['N02'] },
  'document.': { owner:'N04', consumers:['N01','N05','N06'], fallback:['N06'] },
  'audio.': { owner:'N03', consumers:['N01','N02','N05','N06'], fallback:['N01'] },
  'speech.': { owner:'N03', consumers:['N01','N02','N05','N06'], fallback:['N01'] },
  'cognitive.': { owner:'N06', consumers:['N01','N02','N04','N05'], fallback:['N05','N02'] },
  'tool.': { owner:'N06', consumers:['N01','N02','N04','N05'], fallback:['N04'] },
};

export function ownershipFor(capability:string){
  return Object.entries(N05_OWNERSHIP).find(([prefix])=>capability.startsWith(prefix))?.[1];
}

export function canConsume(source:N05Nucleus, capability:string){
  const rule=ownershipFor(capability);
  return !!rule && (rule.owner===source || rule.consumers.includes(source));
}
