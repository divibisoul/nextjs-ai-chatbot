import type { SoulMeshMessage } from './endpoint';
import { randomUUID } from 'crypto';
export const NUCLEUS_ID='N05' as const;
export const PEERS=['N01','N02','N03','N04','N06'] as const;
export type N05Peer=(typeof PEERS)[number];
const urls:Record<N05Peer,string|undefined>={N01:process.env.SOUL_MESH_N01_URL,N02:process.env.SOUL_MESH_N02_URL,N03:process.env.SOUL_MESH_N03_URL,N04:process.env.SOUL_MESH_N04_URL,N06:process.env.SOUL_MESH_N06_URL};
export async function sendTo(target:N05Peer,capability:string,payload:unknown,timeoutMs=15000):Promise<SoulMeshMessage>{const url=urls[target];if(!url)throw new Error(`SOUL_MESH_PEER_URL_NOT_CONFIGURED:${target}`);const message:SoulMeshMessage={protocol:'soul-mesh/1',id:randomUUID(),correlationId:randomUUID(),source:NUCLEUS_ID,target,kind:'request',capability,payload,timestamp:Date.now()};const c=new AbortController();const timer=setTimeout(()=>c.abort(),timeoutMs);try{const token=process.env.SOUL_MESH_TOKEN;const r=await fetch(url,{method:'POST',headers:{'content-type':'application/json',...(token?{authorization:`Bearer ${token}`}:{})},body:JSON.stringify(message),signal:c.signal});const b=await r.json() as SoulMeshMessage;if(b.protocol!==message.protocol||b.correlationId!==message.correlationId||b.source!==target||b.target!==NUCLEUS_ID)throw new Error('SOUL_MESH_RESPONSE_CORRELATION_MISMATCH');if(!r.ok||b.kind==='error')throw new Error(`SOUL_MESH_REMOTE_ERROR:${target}`);return b}finally{clearTimeout(timer)}}
export const N05_OUT_CHANNELS=PEERS.map(x=>`N05.OUT.${x}`);export const N05_IN_CHANNELS=PEERS.map(x=>`N05.IN.${x}`);
