import { NextResponse } from 'next/server';
import { NUCLEUS_ID, SOUL_MESH_PROTOCOL, type SoulMeshMessage, validateMeshMessage } from '@/lib/soul-mesh/endpoint';
import { SOUL_MESH_CAPABILITIES } from '@/lib/soul-mesh/SoulMeshCapabilities';
import { probeAllPeers } from '@/lib/soul-mesh/adapter';
import { soulInferenceCapabilities } from '@/lib/soul-mesh/SoulMeshAI';
import { createN05CapabilityGateway } from '@/src/mesh/N05Capabilities';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const gateway = createN05CapabilityGateway();
const peerBuckets = new Map<string, number[]>();
const RATE_LIMIT = 100;
const WINDOW_MS = 60_000;

function authorized(request: Request): boolean {
  const token = process.env.SOUL_MESH_TOKEN;
  if (!token) return process.env.NODE_ENV !== 'production';
  return request.headers.get('authorization') === `Bearer ${token}`;
}
function rateAllowed(peer: string) {
  const now=Date.now(), recent=(peerBuckets.get(peer)??[]).filter(t=>now-t<WINDOW_MS);
  if(recent.length>=RATE_LIMIT){peerBuckets.set(peer,recent);return false}
  recent.push(now); peerBuckets.set(peer,recent); return true;
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  return NextResponse.json({ protocol:SOUL_MESH_PROTOCOL,nucleus:NUCLEUS_ID,status:'online',runtime:'nextjs-ai-chatbot',capabilities:SOUL_MESH_CAPABILITIES,models:soulInferenceCapabilities(),peers:await probeAllPeers(),timestamp:Date.now() });
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  let message: SoulMeshMessage;
  try { message=(await request.json()) as SoulMeshMessage; } catch { return NextResponse.json({error:'INVALID_JSON'},{status:400}); }
  try {
    validateMeshMessage(message);
    if(!rateAllowed(message.source)) return NextResponse.json({protocol:SOUL_MESH_PROTOCOL,id:message.id,correlationId:message.correlationId,source:NUCLEUS_ID,target:message.source,kind:'error',capability:message.capability,payload:{code:'RATE_LIMITED',retryAfterMs:WINDOW_MS},timestamp:Date.now()},{status:429});
    if(message.kind!=='request') return NextResponse.json(message);
    if(message.capability==='mesh.ping') return NextResponse.json({protocol:SOUL_MESH_PROTOCOL,id:crypto.randomUUID(),correlationId:message.correlationId,source:NUCLEUS_ID,target:message.source,kind:'response',capability:message.capability,payload:{ok:true,nucleus:NUCLEUS_ID},timestamp:Date.now()});
    if(message.capability==='mesh.describe'||message.capability==='core.health') return NextResponse.json({protocol:SOUL_MESH_PROTOCOL,id:crypto.randomUUID(),correlationId:message.correlationId,source:NUCLEUS_ID,target:message.source,kind:'response',capability:message.capability,payload:{nucleus:NUCLEUS_ID,protocol:SOUL_MESH_PROTOCOL,status:'online',capabilities:SOUL_MESH_CAPABILITIES,models:soulInferenceCapabilities()},timestamp:Date.now()});
    const result=await gateway.execute({id:message.id,correlationId:message.correlationId,source:message.source,target:'N5',capability:message.capability??'',payload:message.payload,timestamp:message.timestamp});
    return NextResponse.json({protocol:SOUL_MESH_PROTOCOL,id:result.id,correlationId:result.correlationId,source:'N05',target:message.source,kind:result.status==='ok'?'response':'error',capability:result.capability,payload:result.status==='ok'?result.result:result.error,timestamp:Date.now()},{status:result.status==='ok'?200:result.error?.code==='CAPABILITY_NOT_IMPLEMENTED'?501:403});
  } catch(error) {
    return NextResponse.json({protocol:SOUL_MESH_PROTOCOL,id:message?.id,correlationId:message?.correlationId,source:NUCLEUS_ID,target:message?.source,kind:'error',capability:message?.capability,payload:{code:'SOUL_MESH_ERROR',detail:error instanceof Error?error.message:'Unknown error'},timestamp:Date.now()},{status:400});
  }
}
