export const NUCLEUS_ID = 'N05' as const;
export const SOUL_MESH_PROTOCOL = 'soul-mesh/1' as const;
export type SoulNucleus = 'N01'|'N02'|'N03'|'N04'|'N05'|'N06';
export type SoulMeshMessage = { protocol:typeof SOUL_MESH_PROTOCOL; id:string; correlationId:string; source:SoulNucleus; target:SoulNucleus; kind:'request'|'response'|'event'|'error'; capability?:string; payload:unknown; timestamp:number };
const nuclei = new Set<SoulNucleus>(['N01','N02','N03','N04','N05','N06']);

export function validateMeshMessage(m:SoulMeshMessage){
  if(m.protocol!==SOUL_MESH_PROTOCOL) throw new Error('UNSUPPORTED_MESH_PROTOCOL');
  if(!m.id||!m.correlationId) throw new Error('MISSING_MESSAGE_ID');
  if(!nuclei.has(m.source)||!nuclei.has(m.target)||m.source===m.target) throw new Error('INVALID_NUCLEUS_ROUTE');
  if(m.target!==NUCLEUS_ID) throw new Error('WRONG_TARGET');
  if(!m.capability&&m.kind!=='event') throw new Error('MISSING_CAPABILITY');
  if(!Number.isFinite(m.timestamp)) throw new Error('INVALID_TIMESTAMP');
  return true;
}

function result(message:SoulMeshMessage,payload:unknown,kind:SoulMeshMessage['kind']='response'):SoulMeshMessage{
  return {protocol:SOUL_MESH_PROTOCOL,id:crypto.randomUUID(),correlationId:message.correlationId,source:NUCLEUS_ID,target:message.source,kind,capability:message.capability,payload,timestamp:Date.now()};
}

export async function handleMeshMessage(message:SoulMeshMessage,handlers:Record<string,(payload:unknown)=>Promise<unknown>|unknown>={}){
  validateMeshMessage(message);
  if(message.kind!=='request') return message;
  if(message.capability==='mesh.ping') return result(message,{ok:true,nucleus:NUCLEUS_ID,handler:'N05.mesh.ping',echoed:message.payload,processedAt:Date.now()});
  if(message.capability==='mesh.describe') return result(message,{nucleus:NUCLEUS_ID,protocol:SOUL_MESH_PROTOCOL,capabilities:['mesh.ping','mesh.describe','core.health'],status:'online'});
  if(message.capability==='core.health') return result(message,{ok:true,nucleus:NUCLEUS_ID,runtime:'nextjs-ai-chatbot',timestamp:Date.now()});
  const handler=handlers[message.capability ?? ''];
  if(!handler) return result(message,{code:'CAPABILITY_HANDLER_NOT_REGISTERED',nucleus:NUCLEUS_ID,capability:message.capability},'error');
  try{return result(message,await handler(message.payload));}
  catch(error){return result(message,{code:'CAPABILITY_EXECUTION_ERROR',nucleus:NUCLEUS_ID,detail:error instanceof Error?error.message:'Unknown error'},'error');}
}
