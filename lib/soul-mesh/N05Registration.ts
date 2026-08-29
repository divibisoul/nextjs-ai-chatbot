import crypto from 'node:crypto';
import { SOUL_MESH_CAPABILITIES } from './SoulMeshCapabilities';
import { soulInferenceCapabilities } from './SoulMeshAI';

let registrationToken: string | undefined;
let heartbeatTimer: ReturnType<typeof setInterval> | undefined;
let registered = false;

export type N05Registration = { nucleus:'N05'; endpoint:string; capabilities:string[]; protocol:'soul-mesh/1'; ownership:string[]; instanceId:string; timestamp:number };

function config() {
  return { url: process.env.SOUL_MESH_N01_URL?.trim().replace(/\/$/,'') ?? '', endpoint: process.env.SOUL_MESH_N05_URL?.trim().replace(/\/$/,'') ?? '' };
}

async function registerOnce() {
  const { url, endpoint } = config();
  if (!url || !endpoint) return false;
  const body: N05Registration = { nucleus:'N05', endpoint, protocol:'soul-mesh/1', capabilities:SOUL_MESH_CAPABILITIES.filter(c=>c.owner==='N05').map(c=>c.id), ownership:['inference.*','conversation.*'], instanceId:process.env.SOUL_MESH_INSTANCE_ID ?? crypto.randomUUID(), timestamp:Date.now() };
  const response = await fetch(`${url}/register`, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(body), signal:AbortSignal.timeout(10000), cache:'no-store' });
  if (!response.ok) throw new Error(`N05_REGISTRATION_FAILED:${response.status}`);
  const data = await response.json().catch(()=>({})) as {token?:string};
  registrationToken = data.token;
  registered = true;
  return true;
}

export async function registerN05() {
  if (registered) return {registered:true, token:registrationToken};
  const delays = [0,1000,2000,4000,8000,16000];
  for (const delay of delays) {
    if (delay) await new Promise(resolve=>setTimeout(resolve,delay));
    try { if (await registerOnce()) break; } catch { registered = false; }
  }
  if (!heartbeatTimer) heartbeatTimer = setInterval(() => { heartbeatN05().catch(()=>undefined); }, 60000);
  return {registered, token:registrationToken};
}

export async function heartbeatN05() {
  const {url,endpoint} = config();
  if (!url || !registered || !registrationToken) return false;
  try {
    const response = await fetch(`${url}/heartbeat`, { method:'POST', headers:{'content-type':'application/json','authorization':`Bearer ${registrationToken}`}, body:JSON.stringify({nucleus:'N05',endpoint,timestamp:Date.now()}), signal:AbortSignal.timeout(10000), cache:'no-store' });
    if (!response.ok) { registered=false; registrationToken=undefined; return registerN05().then(result=>result.registered); }
    return true;
  } catch { registered=false; return false; }
}

export function registrationStatus() { const {endpoint,url}=config(); return {registered,tokenPresent:Boolean(registrationToken),endpoint,n01Configured:Boolean(url)}; }
