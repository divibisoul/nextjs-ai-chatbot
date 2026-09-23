import { NextResponse } from 'next/server';
import crypto, { createHmac, timingSafeEqual } from 'node:crypto';
import { NUCLEUS_ID, SOUL_MESH_CONTRACT_VERSION, SOUL_MESH_PROTOCOL, type SoulMeshMessage, validateMeshMessage } from '@/lib/soul-mesh/endpoint';
import { SOUL_MESH_CAPABILITIES } from '@/lib/soul-mesh/SoulMeshCapabilities';
import { probeAllPeers } from '@/lib/soul-mesh/adapter';
import { soulInferenceCapabilities } from '@/lib/soul-mesh/SoulMeshAI';
import { createN05CapabilityGateway } from '@/src/mesh/N05Capabilities';
import { registerN05 } from '@/lib/soul-mesh/N05Registration';
import { verifySoulMeshMessage } from '@/lib/soul-mesh/SoulMeshHmac';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const gateway=createN05CapabilityGateway();
const peerBuckets=new Map<string,number[]>();
const nonces=new Map<string,number>();
const RATE_LIMIT=100, WINDOW_MS=60000;
const OCTACORE_CAPABILITY='octacore.execute';
const N05_MESH_CAPABILITIES=[...SOUL_MESH_CAPABILITIES, {id:OCTACORE_CAPABILITY,version:SOUL_MESH_CONTRACT_VERSION,description:'Octacore execution wrapper over canonical N05 gateway',request:true,response:true,events:false,owner:'N05',execution:'wrapper'}];
if (process.env.NODE_ENV !== 'test') void registerN05().catch(()=>undefined);
function authorized(request:Request){const token=process.env.SOUL_MESH_TOKEN;if(!token)return process.env.NODE_ENV!=='production';return request.headers.get('authorization')===`Bearer ${token}`}
function rateAllowed(peer:string){const now=Date.now(),recent=(peerBuckets.get(peer)??[]).filter(t=>now-t<WINDOW_MS);if(recent.length>=RATE_LIMIT){peerBuckets.set(peer,recent);return false}recent.push(now);peerBuckets.set(peer,recent);return true}
function signatureValid(body:string,request:Request,message:SoulMeshMessage){const hmacSecret=process.env.SOUL_MESH_HMAC_SECRET?.trim();const nonce=request.headers.get('x-soul-mesh-nonce')??'';const hmac=request.headers.get('x-soul-mesh-hmac')??'';if(hmacSecret&&nonce&&hmac)return verifySoulMeshMessage(message,hmacSecret,nonce,hmac);const secret=process.env.SOUL_MESH_SIGNING_SECRET;if(!secret)return process.env.NODE_ENV!=='production';const provided=request.headers.get('x-soul-signature');if(!provided)return false;const expected=createHmac('sha256',secret).update(body).digest('hex');const a=Buffer.from(provided),b=Buffer.from(expected);return a.length===b.length&&timingSafeEqual(a,b)}
function nonceValid(message:SoulMeshMessage,request:Request){const nonce=request.headers.get('x-soul-mesh-nonce')??message.meta?.nonce??message.id;const now=Date.now();for(const [k,t] of nonces)if(now-t>5*WINDOW_MS)nonces.delete(k);if(nonces.has(nonce))return false;nonces.set(nonce,now);return true}
function response(message:SoulMeshMessage,payload:unknown,kind:'response'|'error'='response',traceId:string=crypto.randomUUID()){
  const id=crypto.randomUUID();
  const nonce=crypto.randomUUID();
  const timestamp=Date.now();
  const legacy={
    version:'1.0',
    contractVersion:SOUL_MESH_CONTRACT_VERSION,
    messageId:id,
    source:NUCLEUS_ID,
    target:message.source,
    timestamp,
    nonce,
    correlationId:message.correlationId,
    type:kind==='error'?'ERROR':'TASK_RESULT',
    payload:{capability:message.capability??'',payload},
  };
  const secret=String(process.env.SOUL_MESH_HMAC_SECRET||'').trim();
  const hmac=secret?createHmac('sha256',secret).update(JSON.stringify(legacy),'utf8').digest('hex'):'';
  return {protocol:SOUL_MESH_PROTOCOL,contractVersion:SOUL_MESH_CONTRACT_VERSION,id,correlationId:message.correlationId,source:NUCLEUS_ID,target:message.source,kind,capability:message.capability,payload,timestamp,nonce,...(hmac?{hmac}:{}),meta:{runtime:'nextjs-ai-chatbot',transport:'http-json',encoding:'json',version:SOUL_MESH_PROTOCOL,traceId,nonce}};
}
export async function GET(request:Request){if(!authorized(request))return NextResponse.json({error:'UNAUTHORIZED'},{status:401});return NextResponse.json({protocol:SOUL_MESH_PROTOCOL,contractVersion:SOUL_MESH_CONTRACT_VERSION,nucleus:NUCLEUS_ID,status:'online',runtime:'nextjs-ai-chatbot',capabilities:N05_MESH_CAPABILITIES,models:soulInferenceCapabilities(),peers:await probeAllPeers(),timestamp:Date.now()})}
export async function POST(request:Request){if(!authorized(request))return NextResponse.json({error:'UNAUTHORIZED'},{status:401});const traceId=request.headers.get('x-soul-trace-id')??crypto.randomUUID();const started=Date.now();const raw=await request.text();let message:SoulMeshMessage;try{message=JSON.parse(raw) as SoulMeshMessage}catch{return NextResponse.json({error:'INVALID_JSON',traceId},{status:400})}try{validateMeshMessage(message);if(!signatureValid(raw,request,message))return NextResponse.json({error:'INVALID_MESH_SIGNATURE',traceId},{status:401});if(!nonceValid(message,request))return NextResponse.json(response(message,{code:'REPLAY_DETECTED',traceId},'error',traceId),{status:409});if(!rateAllowed(message.source))return NextResponse.json(response(message,{code:'RATE_LIMITED',retryAfterMs:WINDOW_MS,traceId},'error',traceId),{status:429});if(message.kind!=='request')return NextResponse.json(message);if(message.capability==='mesh.handshake')return NextResponse.json(response(message,{nucleus:NUCLEUS_ID,protocol:SOUL_MESH_PROTOCOL,contractVersion:SOUL_MESH_CONTRACT_VERSION,status:'online',capabilities:N05_MESH_CAPABILITIES,models:soulInferenceCapabilities(),transports:['http'],traceId},'response',traceId));if(message.capability==='mesh.ping')return NextResponse.json(response(message,{ok:true,nucleus:NUCLEUS_ID,traceId,latencyMs:Date.now()-started},'response',traceId));if(message.capability==='mesh.describe'||message.capability==='core.health')return NextResponse.json(response(message,{nucleus:NUCLEUS_ID,protocol:SOUL_MESH_PROTOCOL,contractVersion:SOUL_MESH_CONTRACT_VERSION,status:'online',capabilities:N05_MESH_CAPABILITIES,models:soulInferenceCapabilities(),traceId},'response',traceId));if(message.capability==='mesh.topology')return NextResponse.json(response(message,{nucleus:NUCLEUS_ID,peers:await probeAllPeers(),traceId},'response',traceId));if(message.capability===OCTACORE_CAPABILITY){const value=message.payload&&typeof message.payload==='object'&&!Array.isArray(message.payload)?message.payload as Record<string,unknown>:null;if(!value)return NextResponse.json(response(message,{code:'OCTACORE_N05_PAYLOAD_MUST_BE_OBJECT',traceId},'error',traceId),{status:400});if(typeof value.capability==='string'&&value.capability==='mesh.ping'){return NextResponse.json(response(message,{ok:true,kernel:'G5',nucleus:NUCLEUS_ID,capability:'mesh.ping',job_id:typeof value.job_id==='string'?value.job_id:undefined,value:{ok:true,nucleus:NUCLEUS_ID,handler:'N05.mesh.ping',processedAt:Date.now()}},'response',traceId));}const innerCapability=typeof value.capability==='string'?value.capability.trim():'';if(!innerCapability)return NextResponse.json(response(message,{code:'OCTACORE_N05_CAPABILITY_REQUIRED',traceId},'error',traceId),{status:400});if(!gateway.has(innerCapability))return NextResponse.json(response(message,{code:'OCTACORE_N05_CAPABILITY_NOT_EXECUTABLE',capability:innerCapability,traceId},'error',traceId),{status:501});const nested=await gateway.execute({id:message.id,correlationId:message.correlationId,traceId,target:'N05',source:message.source,capability:innerCapability,payload:value.payload,timestamp:message.timestamp,nonce:message.meta?.nonce});const wrapped=nested.status==='ok'?{ok:true,kernel:'G5',nucleus:NUCLEUS_ID,capability:innerCapability,job_id:typeof value.job_id==='string'?value.job_id:undefined,value:nested.result}:{...nested.error,traceId};return NextResponse.json(response(message,wrapped,nested.status==='ok'?'response':'error',traceId),{status:nested.status==='ok'?200:nested.error?.code==='CAPABILITY_NOT_IMPLEMENTED'?501:502});}
const result=await gateway.execute({id:message.id,correlationId:message.correlationId,traceId,target:'N05',source:message.source,capability:message.capability??'',payload:message.payload,timestamp:message.timestamp,nonce:message.meta?.nonce});const payload=result.status==='ok'?result.result:{...result.error,traceId,latencyMs:Date.now()-started};return NextResponse.json(response(message,payload,result.status==='ok'?'response':'error',traceId),{status:result.status==='ok'?200:result.error?.code==='CAPABILITY_NOT_IMPLEMENTED'?501:result.error?.code==='CAPABILITY_DELEGATION_FAILED'?502:403})}catch(error){return NextResponse.json(response(message,{code:'SOUL_MESH_ERROR',detail:error instanceof Error?error.message:'Unknown error',traceId,latencyMs:Date.now()-started},'error',traceId),{status:400})}}
