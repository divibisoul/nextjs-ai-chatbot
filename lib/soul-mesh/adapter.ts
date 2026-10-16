import crypto from 'node:crypto';
import { NUCLEUS_ID, SOUL_MESH_PROTOCOL, type SoulMeshMessage, type SoulNucleus, handleMeshMessage } from './endpoint';
import { createSoulMeshNonce, signSoulMeshMessage, verifyCanonicalSoulMeshResponse, verifySoulMeshResponse } from './SoulMeshHmac';
export type MeshPeer = { id: Exclude<SoulNucleus, 'N05'>; url: string };
const CONTRACT_VERSION = '1.1.0' as const;
const PEER_ENV: Record<MeshPeer['id'], string> = { N01:'SOUL_MESH_N01_URL', N02:'SOUL_MESH_N02_URL', N03:'SOUL_MESH_N03_URL', N04:'SOUL_MESH_N04_URL', N06:'SOUL_MESH_N06_URL', N07:'SOUL_MESH_N07_URL' };
export function getConfiguredPeers(): MeshPeer[] { return (Object.entries(PEER_ENV) as [MeshPeer['id'],string][]).map(([id,env])=>({id,url:process.env[env]?.trim().replace(/\/$/,'')??''})).filter(p=>Boolean(p.url)); }
export function createRequest(target: MeshPeer['id'], capability:string, payload:unknown):SoulMeshMessage { const id=crypto.randomUUID(); return {protocol:SOUL_MESH_PROTOCOL,contractVersion:CONTRACT_VERSION,id,correlationId:id,source:NUCLEUS_ID,target,kind:'request',capability,payload,timestamp:Date.now(),meta:{runtime:'nextjs-ai-chatbot',transport:'HTTP',encoding:'json',version:CONTRACT_VERSION,traceId:id}}; }
function legacySignature(raw:string){const secret=process.env.SOUL_MESH_SIGNING_SECRET;if(!secret)return undefined;return crypto.createHmac('sha256',secret).update(raw).digest('hex');}
export async function sendToNucleus(
  target: MeshPeer['id'],
  capability: string,
  payload: unknown,
  timeoutMs = 30_000,
): Promise<unknown> {
  const production = process.env.NODE_ENV === 'production';
  const hmacSecret = process.env.SOUL_MESH_HMAC_SECRET?.trim() ?? '';
  const bearerToken = process.env.SOUL_MESH_TOKEN?.trim() ?? '';

  if (production && Buffer.byteLength(hmacSecret, 'utf8') < 32) {
    throw new Error(`MESH_HMAC_NOT_CONFIGURED:${target}`);
  }
  if (production && !bearerToken) {
    throw new Error(`MESH_BEARER_TOKEN_NOT_CONFIGURED:${target}`);
  }
  if (hmacSecret && Buffer.byteLength(hmacSecret, 'utf8') < 32) {
    throw new Error('SOUL_MESH_HMAC_SECRET_TOO_SHORT');
  }

  const peer = getConfiguredPeers().find(candidate => candidate.id === target);
  if (!peer) throw new Error(`MESH_PEER_NOT_CONFIGURED:${target}`);
  if (!capability.trim()) throw new Error('MESH_CAPABILITY_REQUIRED');

  const request = createRequest(target, capability.trim(), payload);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers: Record<string, string> = {
      'content-type': 'application/json',
      accept: 'application/json',
    };
    if (bearerToken) headers.authorization = `Bearer ${bearerToken}`;

    if (hmacSecret) {
      const nonce = createSoulMeshNonce();
      request.nonce = nonce;
      request.meta = { ...(request.meta ?? {}), nonce };
      headers['x-soul-mesh-nonce'] = nonce;
      headers['x-soul-mesh-hmac'] = signSoulMeshMessage(request, hmacSecret, nonce);
    } else {
      // Legacy body signatures remain a non-production migration path only.
      const raw = JSON.stringify(request);
      const signature = legacySignature(raw);
      if (signature) headers['x-soul-signature'] = signature;
    }

    const response = await fetch(`${peer.url}/api/soul-mesh`, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
      cache: 'no-store',
      signal: controller.signal,
    });
    const rawBody: unknown = await response.json().catch(() => null);
    if (!rawBody || typeof rawBody !== 'object') throw new Error('MESH_RESPONSE_INVALID_BODY');
    const body = rawBody as SoulMeshMessage & { nonce?: string; hmac?: string };
    if (
      body.protocol !== SOUL_MESH_PROTOCOL
      || body.contractVersion !== CONTRACT_VERSION
      || typeof body.id !== 'string'
      || !body.id.trim()
      || body.correlationId !== request.correlationId
      || body.target !== NUCLEUS_ID
      || body.source !== target
      || body.capability !== request.capability
      || (body.kind !== 'response' && body.kind !== 'error')
      || !Number.isFinite(body.timestamp)
      || Math.abs(Date.now() - body.timestamp) > 30_000
    ) {
      throw new Error('MESH_RESPONSE_INVALID');
    }

    if (production && !hmacSecret) {
      throw new Error(`MESH_RESPONSE_HMAC_NOT_CONFIGURED:${target}`);
    }
    if (hmacSecret) {
      const validResponse = target === 'N07'
        ? verifySoulMeshResponse(request, body, hmacSecret, String(body.nonce ?? body.meta?.nonce ?? ''), String(body.hmac ?? ''))
        : verifyCanonicalSoulMeshResponse(request, body, hmacSecret);
      if (!validResponse) throw new Error('MESH_RESPONSE_HMAC_INVALID');
    }

    if (!response.ok) throw new Error(`MESH_HTTP_${response.status}`);
    if (body.kind === 'error') {
      const remoteCode = body.payload && typeof body.payload === 'object' && 'code' in body.payload
        ? String((body.payload as { code: unknown }).code)
        : 'UNKNOWN';
      throw new Error(`MESH_REMOTE_ERROR:${target}:${remoteCode}`);
    }
    return body.payload;
  } finally {
    clearTimeout(timer);
  }
}
export async function invokePeerAI(target:MeshPeer['id'],prompt:string,options:{system?:string;model?:'chat-model'|'chat-model-reasoning';temperature?:number;maxOutputTokens?:number}={}){return sendToNucleus(target,'ai.infer',{prompt,...options});}
export async function probePeer(peer:MeshPeer){const started=Date.now();try{const details=await sendToNucleus(peer.id,'mesh.describe',{from:NUCLEUS_ID});return{id:peer.id,configured:true,reachable:true,latencyMs:Date.now()-started,details};}catch(error){return{id:peer.id,configured:true,reachable:false,latencyMs:null,error:error instanceof Error?error.message:String(error)};}}
export async function probeAllPeers(){return Promise.all(getConfiguredPeers().map(probePeer));}
export async function dispatchLocal(message:SoulMeshMessage,handlers:Record<string,(payload:unknown)=>Promise<unknown>|unknown>){return handleMeshMessage(message,handlers);}
export function assertCapabilityResult<T>(value:unknown, label:string):T{if(value===undefined||value===null)throw new Error(`MESH_EMPTY_RESULT:${label}`);return value as T;}
