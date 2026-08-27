import { createHash, randomUUID } from 'node:crypto';
import { canConsume, ownershipFor, type N05Nucleus } from './N05OwnershipMatrix';

type Handler = (request: MeshRequest) => Promise<unknown> | unknown;
export type MeshRequest = { id?:string; correlationId?:string; source:N05Nucleus; target:'N5'; capability:string; payload:unknown; timestamp?:number; nonce?:string };
export type MeshResponse = { id:string; correlationId:string; source:'N5'; target:N05Nucleus; capability:string; status:'ok'|'error'; result?:unknown; error?:{code:string;message:string} };

export class N05MeshGateway {
  private readonly handlers = new Map<string,Handler>();
  register(capability:string, handler:Handler, ownership:{owner:N05Nucleus;consumers:N05Nucleus[]}) {
    if (!capability || typeof handler !== 'function') throw new TypeError('Invalid capability handler');
    if (ownership.owner !== 'N5' || !ownership.consumers.includes('N1')) throw new Error('Invalid N05 ownership declaration');
    this.handlers.set(capability, handler);
  }
  async execute(request:MeshRequest):Promise<MeshResponse>{
    const id=request.id??randomUUID(), correlationId=request.correlationId??randomUUID();
    const rule=ownershipFor(request.capability);
    if (!rule || !canConsume(request.source,request.capability)) return {id,correlationId,source:'N5',target:request.source,capability:request.capability,status:'error',error:{code:'CAPABILITY_FORBIDDEN',message:'Source is not an authorized consumer'}};
    const handler=this.handlers.get(request.capability);
    if (!handler) return {id,correlationId,source:'N5',target:request.source,capability:request.capability,status:'error',error:{code:'CAPABILITY_NOT_IMPLEMENTED',message:`No handler registered for ${request.capability}`}};
    try{return {id,correlationId,source:'N5',target:request.source,capability:request.capability,status:'ok',result:await handler(request)};}
    catch(error){return {id,correlationId,source:'N5',target:request.source,capability:request.capability,status:'error',error:{code:'CAPABILITY_EXECUTION_FAILED',message:error instanceof Error?error.message:String(error)}};}
  }
}
export function signMeshPayload(payload:string,secret:string){return createHash('sha256').update(`${payload}:${secret}`).digest('hex');}
