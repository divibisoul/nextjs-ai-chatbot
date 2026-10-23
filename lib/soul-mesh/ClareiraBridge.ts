/**
 * Clareira application bridge for N05.
 * Carries ClareiraPacket through the existing soul-mesh/1 transport to N01.
 * It does not introduce a second mesh or replace the native nucleus runtime.
 */
import { createHmac } from 'node:crypto';
import { isClareiraPacket, type ClareiraMetrics, type ClareiraPacket } from '../../shared/clareira-contract';

let ingested=0, accepted=0, processed=0, dropped=0, errored=0, inFlight=0, lastLatency=0, startedAt=Date.now();
const samples:number[]=[];

function url(){return (globalThis as any).process?.env?.SOUL_N01_URL?.trim?.().replace(/\/$/,'') ?? '';}

export function ingestClareiraPacket(packet:ClareiraPacket):boolean{
  if(!isClareiraPacket(packet)) throw new Error('INVALID_CLAREIRA_PACKET');
  ingested++; inFlight++; return true;
}

export async function forwardClareiraToN01(packet:ClareiraPacket):Promise<unknown>{
  if(!ingestClareiraPacket(packet)) throw new Error('CLAREIRA_LOCAL_INGEST_FAILED');
  const base=url();
  if(!base){ errored++; inFlight=Math.max(0,inFlight-1); return {accepted:false,forwardedToN01:false,reason:'SOUL_N01_URL_NOT_CONFIGURED'}; }
  const nonce=globalThis.crypto?.randomUUID?.()?.replaceAll('-', '').padEnd(32, '0').slice(0, 32) ?? String(Date.now());
  const message={protocol:'soul-mesh/1',contractVersion:'1.1.0',id:globalThis.crypto?.randomUUID?.() ?? String(Date.now()),correlationId:packet.correlationId,source:'N05',target:'N01',kind:'request',capability:'clareira.ingest',payload:{packet},timestamp:Date.now(),meta:{runtime:'N05',transport:'HTTP',encoding:'json',version:'1.1.0',traceId:packet.correlationId,nonce}};
  const canonical=JSON.stringify({protocol:message.protocol,contractVersion:message.contractVersion,id:message.id,correlationId:message.correlationId,source:message.source,target:message.target,kind:message.kind,capability:message.capability,payload:message.payload,timestamp:message.timestamp,transport:message.meta?.transport,meta:message.meta,nonce});
  const secret=(globalThis as any).process?.env?.SOUL_MESH_SECRET?.trim?.() || (globalThis as any).process?.env?.SOUL_MESH_HMAC_SECRET?.trim?.() || '';
  const token=(globalThis as any).process?.env?.SOUL_MESH_TOKEN?.trim?.();
  const headers:Record<string,string>={'content-type':'application/json','x-soul-correlation-id':packet.correlationId};
  if(secret){headers['x-soul-mesh-nonce']=nonce;headers['x-soul-mesh-hmac']=createHmac('sha256',secret).update(canonical,'utf8').digest('hex');}
  else if(token) headers.authorization=`Bearer ${token}`;
  try{
    const response=await fetch(base+'/api/soul-mesh',{method:'POST',headers,body:JSON.stringify(message),cache:'no-store'});
    const body=await response.json().catch(()=>null);
    if(!response.ok) throw new Error(`N01_CLAREIRA_HTTP_${response.status}`);
    const responsePayload=(body && typeof body==='object') ? ((body as any).payload ?? body) : null;
    accepted++; inFlight=Math.max(0,inFlight-1); lastLatency=Math.max(0,Date.now()-packet.timestamp);
    if(responsePayload && responsePayload.processed === true){ processed++; } samples.push(lastLatency); if(samples.length>128)samples.shift();
    return body;
  }catch(error){errored++;inFlight=Math.max(0,inFlight-1);throw error;}
}

export function recordClareiraDrop(packet:ClareiraPacket,reason:string){dropped++;inFlight=Math.max(0,inFlight-1);return{correlationId:packet.correlationId,reason};}
export function clareiraMetrics():ClareiraMetrics{
  const a=[...samples].sort((x,y)=>x-y),pct=(p:number)=>a.length?a[Math.min(a.length-1,Math.floor((a.length-1)*p))]:0;
  return {capturedAtMs:Date.now(),nodes:{total:1,active:errored===0?1:0,errored},channels:{total:1,open:url()?1:0},packets:{ingested,accepted,processed,dropped,errored,inFlight},latencyMs:{last:lastLatency,p50:pct(.5),p95:pct(.95),max:a[a.length-1]??0},uptimeMs:Date.now()-startedAt};
}
