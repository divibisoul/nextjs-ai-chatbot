const base=process.env.N05_MESH_URL;
if(!base) throw new Error('N05_MESH_URL is required');
const id=crypto.randomUUID(), correlationId=crypto.randomUUID(), timestamp=Date.now(), started=Date.now();
const secret=process.env.SOUL_MESH_SIGNING_SECRET;
const message={protocol:'soul-mesh/1',id,correlationId,source:'N06',target:'N05',kind:'request',capability:'inference.reason',payload:'E2E N06→N05→N06 test: return the word SOUL.',timestamp,meta:{runtime:'n06-e2e',transport:'http-json',encoding:'json',version:'soul-mesh/1',nonce:crypto.randomUUID()}};
const raw=JSON.stringify(message);
const headers={'content-type':'application/json','accept':'application/json',...(process.env.SOUL_MESH_TOKEN?{authorization:`Bearer ${process.env.SOUL_MESH_TOKEN}`}:{})};
if(secret){const {createHmac}=await import('node:crypto');headers['x-soul-signature']=createHmac('sha256',secret).update(raw).digest('hex');}
const response=await fetch(`${base.replace(/\/$/,'')}/api/soul-mesh`,{method:'POST',headers,body:raw});
const body=await response.json().catch(()=>({}));
if(!response.ok) throw new Error(`N05 returned HTTP ${response.status}: ${JSON.stringify(body)}`);
if(body.correlationId!==correlationId) throw new Error('correlationId mismatch');
if(body.source!=='N05'||body.target!=='N06') throw new Error('source/target mismatch');
if(body.capability!=='inference.reason') throw new Error('capability mismatch');
if(body.kind!=='response') throw new Error(`expected response, got ${body.kind}`);
if(!body.payload) throw new Error('empty inference result');
console.log(JSON.stringify({pass:true,latencyMs:Date.now()-started,correlationId,source:body.source,target:body.target,capability:body.capability},null,2));
