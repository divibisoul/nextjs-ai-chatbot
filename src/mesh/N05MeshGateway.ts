import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { canConsume, ownershipFor, type N05Nucleus } from './N05OwnershipMatrix';
import { n05CircuitBreaker, withN05Retry } from './N05Resilience';

const CONTRACT_VERSION = '1.1.0' as const;

type Handler = (request: MeshRequest) => Promise<unknown> | unknown;
export type MeshRequest = {
  id?: string;
  correlationId?: string;
  traceId?: string;
  contractVersion?: string;
  source: N05Nucleus;
  target: 'N05';
  capability: string;
  payload: unknown;
  timestamp?: number;
  nonce?: string;
  hmac?: string;
};
export type MeshResponse = {
  id: string;
  correlationId: string;
  traceId: string;
  contractVersion: typeof CONTRACT_VERSION;
  source: 'N05';
  target: N05Nucleus;
  capability: string;
  status: 'ok' | 'error';
  result?: unknown;
  error?: { code: string; message: string };
};

const RATE_LIMIT=100;
const WINDOW_MS=60_000;
const REPLAY_WINDOW_MS=5*60_000;

function ownershipCapability(capability:string){
  if(capability==='ai.infer')return'inference.';
  if(capability==='conversation')return'conversation.';
  if(capability==='document-processing')return'document.';
  if(capability==='artifact-processing')return'document.';
  if(capability==='tool-execution')return'tool.';
  return capability;
}

export class N05MeshGateway {
 private readonly handlers=new Map<string,Handler>();
 private readonly peerRequests=new Map<N05Nucleus,number[]>();
 private readonly nonces=new Map<string,number>();

 register(capability:string,handler:Handler,_ownership:{owner:N05Nucleus;consumers:N05Nucleus[]}){
  if(!capability||typeof handler!=='function')throw new TypeError('Invalid capability handler');
  this.handlers.set(capability,handler);
 }

 async execute(request:MeshRequest):Promise<MeshResponse>{
  const id=request.id??randomUUID();
  const correlationId=request.correlationId??randomUUID();
  const traceId=request.traceId??randomUUID();
  const response=(status:MeshResponse['status'],result?:unknown,error?:{code:string;message:string}):MeshResponse=>({id,correlationId,traceId,contractVersion:CONTRACT_VERSION,source:'N05',target:request.source,capability:request.capability,status,...(result===undefined?{}:{result}),...(error===undefined?{}:{error})});

  if(request.contractVersion && request.contractVersion!==CONTRACT_VERSION)return response('error',undefined,{code:'MESH_CONTRACT_VERSION_MISMATCH',message:`Expected ${CONTRACT_VERSION}`});
  if(!this.securityAllowed(request))return response('error',undefined,{code:'MESH_SECURITY_REJECTED',message:'Mesh request failed timestamp, replay, rate-limit or signature validation'});
  const ownershipKey=ownershipCapability(request.capability);
  const rule=ownershipFor(ownershipKey);
  if(!rule||!canConsume(request.source,ownershipKey))return response('error',undefined,{code:'CAPABILITY_FORBIDDEN',message:'Source is not an authorized consumer'});

  if(rule.owner!=='N05'){
    const candidates=[rule.owner,...(rule.fallback??[])].filter((value,index,all)=>all.indexOf(value)===index);
    let lastError:unknown;
    for(const target of candidates){
      try{
        if(target==='N05'){
          const local=this.handlers.get(request.capability);
          if(!local)throw new Error(`No N05 fallback handler for ${request.capability}`);
          return response('ok',await local(request));
        }
        const{sendToNucleus}=await import('../../lib/soul-mesh/adapter');
        const result=await withN05Retry(()=>sendToNucleus(target as Exclude<N05Nucleus,'N05'>,request.capability,request.payload,30000),target,{retries:2,breaker:n05CircuitBreaker});
        return response('ok',result);
      }catch(error){lastError=error;}
    }
    return response('error',undefined,{code:'CAPABILITY_DELEGATION_FAILED',message:lastError instanceof Error?lastError.message:String(lastError??'No owner/fallback reachable')});
  }

  const handler=this.handlers.get(request.capability);
  if(!handler)return response('error',undefined,{code:'CAPABILITY_NOT_IMPLEMENTED',message:`No handler registered for ${request.capability}`});
  try{return response('ok',await handler(request));}
  catch(error){return response('error',undefined,{code:'CAPABILITY_EXECUTION_FAILED',message:error instanceof Error?error.message:String(error)});}
 }

 private securityAllowed(request:MeshRequest){
  const now=Date.now();
  if(request.timestamp!==undefined&&Math.abs(now-request.timestamp)>REPLAY_WINDOW_MS)return false;
  if(request.nonce){
    for(const [nonce,time] of this.nonces)if(now-time>REPLAY_WINDOW_MS)this.nonces.delete(nonce);
    if(this.nonces.has(request.nonce))return false;
    this.nonces.set(request.nonce,now);
  }
  const recent=(this.peerRequests.get(request.source)??[]).filter(time=>now-time<WINDOW_MS);
  if(recent.length>=RATE_LIMIT)return false;
  recent.push(now);this.peerRequests.set(request.source,recent);

  const secret=process.env.SOUL_MESH_HMAC_SECRET?.trim();
  const required=process.env.SOUL_MESH_GATEWAY_HMAC_REQUIRED==='true';
  if(!secret)return !required;
  if(!request.hmac)return !required;
  const canonical=JSON.stringify({id:request.id??'',correlationId:request.correlationId??'',traceId:request.traceId??'',contractVersion:request.contractVersion??CONTRACT_VERSION,source:request.source,target:request.target,capability:request.capability,payload:request.payload,timestamp:request.timestamp??0,nonce:request.nonce??''});
  const expected=createHmac('sha256',secret).update(canonical).digest('hex');
  const a=Buffer.from(request.hmac,'utf8');
  const b=Buffer.from(expected,'utf8');
  return a.length===b.length&&timingSafeEqual(a,b);
 }
}

export function signMeshPayload(payload:string,secret:string){return createHmac('sha256',secret).update(payload).digest('hex');}
