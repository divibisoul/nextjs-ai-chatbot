import { afterEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { describeLlamaIndexAdapter, retrieveWithLlamaIndex } from './LlamaIndexAdapter';

const original={...process.env};
afterEach(()=>{for(const key of Object.keys(process.env)){if(!(key in original))delete process.env[key];}Object.assign(process.env,original);});

describe('LlamaIndex adapter boundary',()=>{
 test('disabled remains DEGRADED',async()=>{
  delete process.env.SOUL_N05_LLAMAINDEX_ENABLED;
  const state=describeLlamaIndexAdapter();
  assert.equal(state.state, 'DEGRADED');
  assert.equal(state.code, 'LLAMA_INDEX_ADAPTER_DISABLED');
  const result=await retrieveWithLlamaIndex({query:'test',documents:[{text:'alpha'}]});
  assert.equal(result.state, 'DEGRADED');
  assert.equal(result.code, 'LLAMA_INDEX_ADAPTER_DISABLED');
 });
 test('missing source remains DEGRADED',()=>{
  process.env.SOUL_N05_LLAMAINDEX_ENABLED='true';
  process.env.SOUL_N05_LLAMAINDEX_ROOT='/definitely/missing/llama-index';
  process.env.OPENAI_API_KEY='test';
  const state=describeLlamaIndexAdapter();
  assert.equal(state.state, 'DEGRADED');
  assert.equal(state.code, 'LLAMA_INDEX_SOURCE_NOT_AVAILABLE');
 });
 test('configured source is not promoted before real retrieval',()=>{
  process.env.SOUL_N05_LLAMAINDEX_ENABLED='true';
  process.env.SOUL_N05_LLAMAINDEX_ROOT=process.cwd();
  process.env.OPENAI_API_KEY='test';
  const state=describeLlamaIndexAdapter();
  assert.equal(state.state, 'DEGRADED');
  assert.equal(state.code, 'LLAMA_INDEX_EXECUTION_NOT_YET_PROVEN');
 });
});
