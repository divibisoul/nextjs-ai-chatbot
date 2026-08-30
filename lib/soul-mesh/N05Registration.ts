import crypto from 'node:crypto';
import { SOUL_MESH_CAPABILITIES } from './SoulMeshCapabilities';
import { soulInferenceCapabilities } from './SoulMeshAI';
import { N05PeerMeshBridge } from '@/src/mesh/N05PeerMeshBridge';

let registrationToken:string|undefined;
let heartbeatTimer:ReturnType<typeof setInterval>|undefined;
let registered=false;

export type N05Registration={nucleus:'N05';endpoint:string;capabilities:string[];protocol:'soul-mesh/1';ownership:string[];instanceId:string;timestamp:number;models:ReturnType<typeof soulInferenceCapabilities>};

function config(){return {endpoint:process.env.SOUL_MESH_N05_URL?.trim().replace(/\/$/,'')??'',n01Url:process.env.SOUL_MESH_N01_URL?.trim().replace(/\/$/,'')??''};}

async function registerOnce(){
 const {endpoint,n01Url}=config();
 if(!endpoint||!n01Url)return false;
 const bridge=new N05PeerMeshBridge({peers:{N01:n01Url},timeoutMs:10000,retries:2});
 const body:N05Registration={nucleus:'N05',endpoint,protocol:'soul-mesh/1',capabilities:SOUL_MESH_CAPABILITIES.filter(c=>c.owner==='N05').map(c=>c.id),ownership:['inference.*','conversation.*'],instanceId:process.env.SOUL_MESH_INSTANCE_ID??crypto.randomUUID(),timestamp:Date.now(),models:soulInferenceCapabilities()};
 const result=await bridge.request('N01','mesh.handshake',body);
 const payload=result.payload as {payload?:{token?:string;registrationToken?:string;accepted?:boolean};token?:string;registrationToken?:string;accepted?:boolean};
 const ack=payload?.payload??payload;
 if(ack?.accepted===false)throw new Error('N05_REGISTRATION_REJECTED');
 registrationToken=ack?.token??ack?.registrationToken;
 registered=true;
 return true;
}

export async function registerN05(){
 if(registered)return {registered:true,token:registrationToken};
 const delays=[0,1000,2000,4000,8000,16000];
 for(const delay of delays){if(delay)await new Promise(resolve=>setTimeout(resolve,delay));try{if(await registerOnce())break;}catch{registered=false;}}
 if(!heartbeatTimer)heartbeatTimer=setInterval(()=>{heartbeatN05().catch(()=>undefined);},60000);
 return {registered,token:registrationToken};
}

export async function heartbeatN05(){
 const {endpoint,n01Url}=config();
 if(!endpoint||!registered||!n01Url)return false;
 try{
  const bridge=new N05PeerMeshBridge({peers:{N01:n01Url},timeoutMs:10000,retries:1});
  const result=await bridge.request('N01','mesh.health',{nucleus:'N05',endpoint,timestamp:Date.now(),registrationToken});
  if(result.status!==200){registered=false;registrationToken=undefined;return registerN05().then(result=>result.registered);}
  return true;
 }catch{registered=false;return false;}
}

export function registrationStatus(){const {endpoint,n01Url}=config();return {registered,tokenPresent:Boolean(registrationToken),endpoint,n01Configured:Boolean(n01Url),mechanism:'Soul Mesh mesh.handshake + mesh.health'};}
