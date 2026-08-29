import { randomUUID } from 'node:crypto';
import { n05PeerMeshBridge } from './N05PeerMeshBridge';

export type ComboStep = { target:'N01'|'N02'|'N03'|'N04'|'N06'; capability:string; payload?:unknown };

export async function runN05N06InferenceCombo(prompt:string){
 const correlationId=randomUUID();
 const traceId=randomUUID();
 const n06=await n05PeerMeshBridge.request('N06','cognitive.plan',{prompt},{...correlationId},traceId);
 const n06Payload=(n06 as {payload?:unknown}).payload;
 const n01=await n05PeerMeshBridge.request('N01','orchestration.route',{source:'N05',reasoning:n06Payload},correlationId,traceId);
 return {correlationId,traceId,steps:[n06,n01],final:(n01 as {payload?:unknown}).payload};
}

export async function runN05Combo(steps:readonly ComboStep[]){return n05PeerMeshBridge.combo(steps);}
