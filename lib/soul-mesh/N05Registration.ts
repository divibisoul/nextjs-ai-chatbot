import { SOUL_MESH_CAPABILITIES } from './SoulMeshCapabilities';

let registrationToken:string|undefined;
let heartbeatTimer:ReturnType<typeof setInterval>|undefined;

export type N05Registration={nucleus:'N05';endpoint:string;capabilities:string[];protocol:'soul-mesh/1';ownership:string[]};
export async function registerN05(){
  const url=process.env.SOUL_MESH_N01_URL;
  const endpoint=process.env.SOUL_MESH_N05_URL;
  if(!url||!endpoint) return {registered:false,reason:'SOUL_MESH_N01_URL or SOUL_MESH_N05_URL not configured'};
  const body:N05Registration={nucleus:'N05',endpoint,protocol:'soul-mesh/1',capabilities:SOUL_MESH_CAPABILITIES.filter(c=>c.owner==='N05').map(c=>c.id),ownership:['inference.*','conversation.*']};
  const response=await fetch(`${url.replace(/\/$/,'')}/register`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(30000)});
  if(!response.ok) throw new Error(`N05_REGISTRATION_FAILED:${response.status}`);
  const data=await response.json().catch(()=>({})); registrationToken=data.token;
  if(!heartbeatTimer) heartbeatTimer=setInterval(()=>heartbeatN05().catch(()=>undefined),60000);
  return {registered:true,token:registrationToken};
}
export async function heartbeatN05(){const url=process.env.SOUL_MESH_N01_URL;if(!url||!registrationToken)return false;const r=await fetch(`${url.replace(/\/$/,'')}/heartbeat`,{method:'POST',headers:{'content-type':'application/json','authorization':`Bearer ${registrationToken}`},body:JSON.stringify({nucleus:'N05',timestamp:Date.now()}),signal:AbortSignal.timeout(30000)});if(!r.ok){registrationToken=undefined;await registerN05().catch(()=>undefined);return false}return true}
