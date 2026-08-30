import { randomUUID } from 'node:crypto';
import { createSoulMeshNonce, signSoulMeshMessage } from '@/lib/soul-mesh/SoulMeshHmac';
import { N05AdaptiveTransportRouter } from './N05AdaptiveTransportRouter';

type NucleusId = 'N01' | 'N02' | 'N03' | 'N04' | 'N06';
type PeerState = { url: string; healthy: boolean; failures: number; latencyMs: number | null; openedUntil: number };
export type N05MeshEnvelope = { protocol:'soul-mesh/1'; id:string; correlationId:string; traceId:string; source:'N05'; target:NucleusId; kind:'request'; capability:string; payload:unknown; timestamp:number; nonce:string; transport:'http'; meta:{runtime:'n05-peer-bridge';transport:'http-json';nonce:string;traceId:string} };
const PEERS: readonly NucleusId[] = ['N01','N02','N03','N04','N06'];
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
const envKey=(p:NucleusId)=>`SOUL_MESH_${p}_URL`;
const normalize=(u:string)=>u.replace(/\/+$/,'');

export class N05PeerMeshBridge {
 private readonly peers=new Map<NucleusId,PeerState>();
 private readonly timeoutMs:number;
 private readonly retries:number;
 private readonly transportRouter=new N05AdaptiveTransportRouter();
 constructor(options:{timeoutMs?:number;retries?:number;peers?:Partial<Record<NucleusId,string>>}={}){
  this.timeoutMs=options.timeoutMs??Number(process.env.SOUL_MESH_TIMEOUT_MS??30000);
  this.retries=options.retries??Number(process.env.SOUL_MESH_RETRIES??2);
  for(const peer of PEERS){const url=options.peers?.[peer]??process.env[envKey(peer)];if(url)this.peers.set(peer,{url:normalize(url),healthy:false,failures:0,latencyMs:null,openedUntil:0});}
  this.transportRouter.register('http',async(peer,request,signal)=>{
   const state=this.peers.get(peer as NucleusId);if(!state)throw new Error(`PEER_NOT_CONFIGURED:${peer}`);
   const envelope=request as N05MeshEnvelope;
   const hmacSecret=process.env.SOUL_MESH_HMAC_SECRET?.trim();
   const hmac=hmacSecret?signSoulMeshMessage(envelope as never,hmacSecret,envelope.nonce):undefined;
   const headers:Record<string,string>={'content-type':'application/json',accept:'application/json','x-soul-nucleus':'N05','x-soul-target':envelope.target,'x-correlation-id':envelope.correlationId,'x-soul-trace-id':envelope.traceId,traceparent:`00-${envelope.traceId.replaceAll('-','').slice(0,32).padEnd(32,'0')}-${envelope.id.replaceAll('-','').slice(0,16).padEnd(16,'0')}-01`};
   if(hmacSecret&&hmac){headers['x-soul-mesh-nonce']=envelope.nonce;headers['x-soul-mesh-hmac']=hmac;}
   const response=await fetch(`${state.url}${state.url.endsWith('/mesh/in')?'':'/mesh/in'}`,{method:'POST',headers,body:JSON.stringify(envelope),cache:'no-store',signal});
   const text=await response.text();let body:unknown=text;try{body=text?JSON.parse(text):null;}catch{}
   if(!response.ok)throw new Error(`MESH_HTTP_${response.status}`);
   return {status:response.status,payload:body};
  });
 }
 configuredPeers(){return [...this.peers.keys()];}
 transportSnapshot(){return this.transportRouter.snapshot();}
 async request(peer:NucleusId,capability:string,payload:unknown,correlationId=randomUUID(),traceId=randomUUID()){
  const state=this.peers.get(peer);if(!state)throw new Error(`PEER_NOT_CONFIGURED:${peer}`);if(state.openedUntil>Date.now())throw new Error(`PEER_CIRCUIT_OPEN:${peer}`);
  let last:unknown;
  for(let attempt=0;attempt<=this.retries;attempt++){
   const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),this.timeoutMs);const started=Date.now();
   try{
    const nonce=createSoulMeshNonce();
    const envelope:N05MeshEnvelope={protocol:'soul-mesh/1',id:randomUUID(),correlationId,traceId,source:'N05',target:peer,kind:'request',capability,payload,timestamp:Date.now(),nonce,transport:'http',meta:{runtime:'n05-peer-bridge',transport:'http-json',nonce,traceId}};
    const routed=await this.transportRouter.send(peer,envelope,controller.signal);
    state.healthy=true;state.failures=0;state.latencyMs=Date.now()-started;
    return{peer,payload:(routed.result as {payload:unknown}).payload,status:(routed.result as {status:number}).status,latencyMs:state.latencyMs,attempt,transport:routed.name};
   }catch(error){last=error;state.failures++;state.healthy=false;if(state.failures>=5)state.openedUntil=Date.now()+60000;if(attempt<this.retries)await sleep(150*(2**attempt)+Math.floor(Math.random()*100));}
   finally{clearTimeout(timer);}
  }
  throw last instanceof Error?last:new Error(`PEER_REQUEST_FAILED:${peer}`);
 }
 async health(peer:NucleusId){return this.request(peer,'mesh.health',{nucleus:'N05'});}
 async broadcast(capability:string,payload:unknown){return Promise.allSettled([...this.peers.keys()].map(peer=>this.request(peer,capability,payload)));}
 async combo(steps:readonly {target:NucleusId;capability:string;payload?:unknown}[]){const correlationId=randomUUID(),traceId=randomUUID();let value:unknown=null;const results:unknown[]=[];for(const step of steps){const result=await this.request(step.target,step.capability,step.payload??value,correlationId,traceId);value=result.payload;results.push(result);}return{correlationId,traceId,results,final:value};}
}
export const n05PeerMeshBridge=new N05PeerMeshBridge();
