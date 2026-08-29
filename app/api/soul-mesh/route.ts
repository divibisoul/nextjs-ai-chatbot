import { NextResponse } from 'next/server';
import crypto, { createHmac, timingSafeEqual } from 'node:crypto';
import { NUCLEUS_ID, SOUL_MESH_PROTOCOL, type SoulMeshMessage, validateMeshMessage } from '@/lib/soul-mesh/endpoint';
import { SOUL_MESH_CAPABILITIES } from '@/lib/soul-mesh/SoulMeshCapabilities';
import { probeAllPeers } from '@/lib/soul-mesh/adapter';
import { soulInferenceCapabilities } from '@/lib/soul-mesh/SoulMeshAI';
import { createN05CapabilityGateway } from '@/src/mesh/N05Capabilities';
import { registerN05 } from '@/lib/soul-mesh/N05Registration';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const gateway=createN05CapabilityGateway();
const peerBuckets=new Map<string,number[]>();
const nonces=new Map<string,number>();
const RATE_LIMIT=100, WINDOW_MS=60000;
void registerN05().catch(()=>undefined);
function authorized(request:Request){const token=process.env.SOUL_MESH_TOKEN;if(!token)return process.env.NODE_ENV!=='production';return request.headers.get('authorization')===`Bearer ${token}`}
function rateAllowed(peer:string){const now=Date.now(),recent=(peerBuckets.get(peer)??[]).filter(t=>now-t<WINDOW_MS);if(recent.length>=RATE_LIMIT){peerBuckets.set(peer,recent);return false}recent.push(now);peerBuckets.set(peer,recent);return true}
function signatureValid(body:string,request:Request){const secret=process.env.SOUL_MESH_SIGNING_SECRET;if(!secret)return process.env.NODE_ENV!=='production';const provided=request.headers.get('x-soul-signature');if(!provided)return false;const expected=createHmac('sha256',secret).update(body).digest('hex');const a=Buffer.from(provided),b=Buffer.from(expected);return a.length===b.length&&timingSafeEqual(a,b)}
function nonceValid(message:SoulMeshMessage){const nonce=message.meta?.nonce??message.id;const now=Date.now();for(const [k,t] of nonces)if(now-t>5*WINDOW_MS)nonces.delete(k);if(nonces.has(nonce))return false;nonces.set(nonce,now);return true}
function response(message:SoulMeshMessage,payload:unknown,kind:'response'|'error'='response'){return {protocol:SOUL_MESH_PROTOCOL,id:crypto.randomUUID(),correlationId:message.correlationId,source:NUCLEUS_ID,target:message.source,kind,capability:message.capability,payload,timestamp:Date.now(),meta:{runtime:'nextjs-ai-chatbot',transport:'http-json',encoding:'json',version:SOUL_MESH_PROTOCOL,nonce:crypto.randomUUID()}}}
export async function GET(request:Request){if(!authorized(request))return NextResponse.json({error:'UNAUTHORIZED'},{status:401});return NextResponse.json({protocol:SOUL_MESH_PROTOCOL,nucleus:NUCLEUS_ID,status:'online',runtime:'nextjs-ai-chatbot',capabilities:SOUL_MESH_CAPABILITIES,models:soulInferenceCapabilities(),peers:await probeAllPeers(),timestamp:Date.now()})}
export async function POST(request:Request){if(!authorized(request))return NextResponse.json({error:'UNAUTHORIZED'},{status:401});const raw=await request.text();if(!signatureValid(raw,request))return NextResponse.json({error:'INVALID_MESH_SIGNATURE'},{status:401});let message:SoulMeshMessage;try{message=JSON.parse(raw) as SoulMeshMessage}catch{return NextResponse.json({error:'INVALID_JSON'},{status:400})}try{validateMeshMessage(message);if(!nonceValid(message))return NextResponse.json(response(message,{code:'REPLAY_DETECTED'},'error'),{status:409});if(!rateAllowed(message.source))return NextResponse.json(response(message,{code:'RATE_LIMITED',retryAfterMs:WINDOW_MS},'error'),{status:429});if(message.kind!=='request')return NextResponse.json(message);if(message.capability==='mesh.ping')return NextResponse.json(response(message,{ok:true,nucleus:NUCLEUS_ID}));if(message.capability==='mesh.describe'||message.capability==='core.health')return NextResponse.json(response(message,{nucleus:NUCLEUS_ID,protocol:SOUL_MESH_PROTOCOL,status:'online',capabilities:SOUL_MESH_CAPABILITIES,models:soulInferenceCapabilities()}));const result=await gateway.execute({id:message.id,correlationId:message.correlationId,source:message.source,target:'N05',capability:message.capability??'',payload:message.payload,timestamp:message.timestamp,nonce:message.meta?.nonce});return NextResponse.json(response(message,result.status==='ok'?result.result:result.error,result.status==='ok'?'response':'error'),{status:result.status==='ok'?200:result.error?.code==='CAPABILITY_NOT_IMPLEMENTED'?501:result.error?.code==='CAPABILITY_DELEGATION_FAILED'?502:403})}catch(error){return NextResponse.json(response(message,{code:'SOUL_MESH_ERROR',detail:error instanceof Error?error.message:'Unknown error'},'error'),{status:400})}}
