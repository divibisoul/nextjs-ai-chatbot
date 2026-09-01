import { createHmac } from 'node:crypto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { N07NeuralBridge } from './N07NeuralBridge';

const secret='n07-test-secret-0123456789';
const hmac=(data:string)=>createHmac('sha256',secret).update(data,'utf8').digest('hex');

test('N05 N07 bridge emits canonical request and verifies canonical response HMAC',async()=>{
 const old=globalThis.fetch;
 globalThis.fetch=async(_input,init)=>{
  const body=JSON.parse(String(init?.body)); const headers=new Headers(init?.headers);
  const req=JSON.stringify({protocol:body.protocol,contractVersion:body.contractVersion,id:body.id,correlationId:body.correlationId,source:body.source,target:body.target,kind:body.kind,capability:body.capability,payload:body.payload,timestamp:body.timestamp,transport:null,meta:null,nonce:body.nonce});
  assert.equal(body.protocol,'soul-mesh/1'); assert.equal(body.contractVersion,'1.1.0'); assert.equal(body.source,'N05'); assert.equal(body.target,'N07'); assert.equal(body.hmac,hmac(req)); assert.equal(headers.get('x-soul-mesh-hmac'),body.hmac); assert.equal(headers.get('x-soul-mesh-nonce'),body.nonce);
  const response={protocol:'soul-mesh/1',contractVersion:'1.1.0',id:'n07-response',correlationId:body.correlationId,source:'N07',target:'N05',kind:'response',capability:body.capability,payload:{values:[4,9],status:'ok'},timestamp:Date.now()}; const nonce='response-nonce';
  const unsigned=JSON.stringify({version:'1.0',contractVersion:'1.1.0',messageId:response.id,source:'N07',target:'N05',timestamp:response.timestamp,nonce,correlationId:response.correlationId,type:'TASK_RESULT',payload:{capability:response.capability,payload:response.payload}}); const sig=hmac(unsigned);
  return new Response(JSON.stringify({...response,nonce,hmac:sig}),{status:200,headers:{'content-type':'application/json','x-soul-mesh-nonce':nonce,'x-soul-mesh-hmac':sig}});
 };
 try{const r=await new N07NeuralBridge('N05',{baseUrl:'https://n07.test',secret}).forward([2,3],'corr-n05');assert.equal(r.correlationId,'corr-n05');assert.deepEqual(r.payload,[4,9]);}
 finally{globalThis.fetch=old;}
});
