const base=process.env.N05_MESH_URL;
if(!base) throw new Error('N05_MESH_URL is required');
const correlationId=crypto.randomUUID(); const started=Date.now();
const response=await fetch(`${base.replace(/\/$/,'')}/api/soul-mesh`,{method:'POST',headers:{'content-type':'application/json','x-correlation-id':correlationId},body:JSON.stringify({id:crypto.randomUUID(),correlationId,source:'N6',target:'N5',capability:'inference.reason',payload:'E2E N6→N5→N6 test: return the word SOUL.'})});
const body=await response.json().catch(()=>({}));
if(!response.ok) throw new Error(`N05 returned HTTP ${response.status}: ${JSON.stringify(body)}`);
if(body.correlationId!==correlationId) throw new Error('correlationId mismatch');
if(body.source!=='N5'||body.target!=='N6') throw new Error('source/target mismatch');
console.log(JSON.stringify({pass:true,latencyMs:Date.now()-started,correlationId,source:body.source,target:body.target,capability:body.capability},null,2));
