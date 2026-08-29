const base=process.env.SOUL_MESH_N05_URL||'http://localhost:3000';
const n06=process.env.SOUL_MESH_N06_URL;
if(!n06) throw new Error('SOUL_MESH_N06_URL is required');
const correlationId=crypto.randomUUID();
const traceId=crypto.randomUUID();
const envelope={protocol:'soul-mesh/1',id:crypto.randomUUID(),correlationId,traceId,source:'N05',target:'N06',kind:'request',capability:'cognitive.plan',payload:{prompt:'SOUL_MESH_N05_N06_COMBO_PROBE'},timestamp:Date.now(),nonce:crypto.randomUUID(),transport:'http'};
const response=await fetch(`${n06.replace(/\/+$/,'')}/mesh/in`,{method:'POST',headers:{'content-type':'application/json','x-soul-nucleus':'N05','x-soul-target':'N06','x-correlation-id':correlationId,traceparent:`00-${traceId.replaceAll('-','').slice(0,32).padEnd(32,'0')}-${envelope.id.replaceAll('-','').slice(0,16).padEnd(16,'0')}-01`},body:JSON.stringify(envelope)});
const body=await response.text();
if(!response.ok) throw new Error(`N06_HTTP_${response.status}:${body}`);
let parsed;try{parsed=JSON.parse(body);}catch{throw new Error('N06_RESPONSE_NOT_JSON');}
if(parsed.correlationId!==correlationId) throw new Error('CORRELATION_ID_MISMATCH');
console.log(JSON.stringify({ok:true,source:'N05',target:'N06',correlationId,traceId,status:response.status,response:parsed},null,2));
