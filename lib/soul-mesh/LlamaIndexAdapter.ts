import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

export const LLAMA_INDEX_CAPABILITY = 'retrieval.llama-index@1.0.0' as const;
export const LLAMA_INDEX_REVISION = '962940ddc079cc21701d28d1237c84c82a7c5164' as const;
export type LlamaIndexState = 'PASS' | 'FAIL' | 'DEGRADED';

export interface LlamaIndexDocument {
  text: string;
  metadata?: Record<string, string | number | boolean>;
}

export interface LlamaIndexRequest {
  query: string;
  documents: LlamaIndexDocument[];
  topK?: number;
}

export interface LlamaIndexEvidence {
  state: LlamaIndexState;
  code?: string;
  provider: 'run-llama/llama_index';
  revision: typeof LLAMA_INDEX_REVISION;
  root: string;
  python: string;
  enabled: boolean;
  sourcePresent: boolean;
  embeddingModel: string;
  credentialsPresent: boolean;
}

function env(name: string, fallback = '') { return (process.env[name] ?? fallback).trim(); }
function enabled() { return /^(1|true|yes)$/i.test(env('SOUL_N05_LLAMAINDEX_ENABLED')); }

function config() {
  const embeddingModel = env('SOUL_N05_LLAMAINDEX_EMBEDDING_MODEL', 'text-embedding-3-small');
  return {
    python: env('SOUL_N05_LLAMAINDEX_PYTHON', 'python3'),
    root: path.resolve(env('SOUL_N05_LLAMAINDEX_ROOT', 'integrations/soul-upstream/llama-index')),
    embeddingModel,
    credentialsPresent: Boolean(env('OPENAI_API_KEY')),
    timeoutMs: Math.max(10_000, Number.parseInt(env('SOUL_N05_LLAMAINDEX_TIMEOUT_MS', '120000'), 10) || 120_000),
    maxDocuments: Math.max(1, Math.min(500, Number.parseInt(env('SOUL_N05_LLAMAINDEX_MAX_DOCUMENTS', '100'), 10) || 100)),
  };
}

export function describeLlamaIndexAdapter(): LlamaIndexEvidence {
  const c = config();
  const sourcePresent = fs.existsSync(c.root) && fs.statSync(c.root).isDirectory();
  if (!enabled()) return { state:'DEGRADED', code:'LLAMA_INDEX_ADAPTER_DISABLED', provider:'run-llama/llama_index', revision:LLAMA_INDEX_REVISION, root:c.root, python:c.python, enabled:false, sourcePresent, embeddingModel:c.embeddingModel, credentialsPresent:c.credentialsPresent };
  if (!sourcePresent) return { state:'DEGRADED', code:'LLAMA_INDEX_SOURCE_NOT_AVAILABLE', provider:'run-llama/llama_index', revision:LLAMA_INDEX_REVISION, root:c.root, python:c.python, enabled:true, sourcePresent:false, embeddingModel:c.embeddingModel, credentialsPresent:c.credentialsPresent };
  if (!c.credentialsPresent) return { state:'DEGRADED', code:'LLAMA_INDEX_EMBEDDING_CREDENTIALS_NOT_AVAILABLE', provider:'run-llama/llama_index', revision:LLAMA_INDEX_REVISION, root:c.root, python:c.python, enabled:true, sourcePresent:true, embeddingModel:c.embeddingModel, credentialsPresent:false };
  return { state:'DEGRADED', code:'LLAMA_INDEX_EXECUTION_NOT_YET_PROVEN', provider:'run-llama/llama_index', revision:LLAMA_INDEX_REVISION, root:c.root, python:c.python, enabled:true, sourcePresent:true, embeddingModel:c.embeddingModel, credentialsPresent:true };
}

export async function retrieveWithLlamaIndex(request: LlamaIndexRequest): Promise<Record<string, unknown>> {
  const evidence = describeLlamaIndexAdapter();
  if (!evidence.enabled || !evidence.sourcePresent || !evidence.credentialsPresent) return { ...evidence, capability: LLAMA_INDEX_CAPABILITY };
  const query = request.query.trim();
  if (!query) return { ...evidence, state:'FAIL', code:'LLAMA_INDEX_QUERY_REQUIRED', capability:LLAMA_INDEX_CAPABILITY };
  const c = config();
  if (!Array.isArray(request.documents) || request.documents.length === 0) return { ...evidence, state:'FAIL', code:'LLAMA_INDEX_DOCUMENTS_REQUIRED', capability:LLAMA_INDEX_CAPABILITY };
  if (request.documents.length > c.maxDocuments) return { ...evidence, state:'FAIL', code:'LLAMA_INDEX_TOO_MANY_DOCUMENTS', maxDocuments:c.maxDocuments, capability:LLAMA_INDEX_CAPABILITY };

  const payload = JSON.stringify({
    root:c.root,
    query,
    documents:request.documents,
    topK:Math.max(1, Math.min(20, request.topK ?? 5)),
    embeddingModel:c.embeddingModel,
  });

  const child = spawn(c.python, [path.resolve('scripts/llama_index_runner.py')], { cwd:process.cwd(), stdio:['pipe','pipe','pipe'] });
  let stdout='', stderr='';
  child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8');
  child.stdout.on('data', chunk => { stdout += chunk; });
  child.stderr.on('data', chunk => { stderr += chunk; });

  const result = await new Promise<{code:number|null;signal:NodeJS.Signals|null}>((resolve,reject) => {
    const timer=setTimeout(()=>{ child.kill('SIGTERM'); reject(new Error('LLAMA_INDEX_TIMEOUT')); },c.timeoutMs);
    child.once('error',error=>{clearTimeout(timer);reject(error)});
    child.once('exit',(code,signal)=>{clearTimeout(timer);resolve({code,signal})});
    child.stdin.end(payload);
  }).catch(error=>({code:null,signal:null,error}));

  if ('error' in result && result.error) {
    const message=result.error instanceof Error?result.error.message:String(result.error);
    return { ...evidence, state:message==='LLAMA_INDEX_TIMEOUT'?'FAIL':'DEGRADED', code:message==='LLAMA_INDEX_TIMEOUT'?'LLAMA_INDEX_TIMEOUT':'LLAMA_INDEX_PROCESS_UNAVAILABLE', detail:message, stderr:stderr.slice(-4000), capability:LLAMA_INDEX_CAPABILITY };
  }
  if (result.code !== 0) return { ...evidence, state:'FAIL', code:'LLAMA_INDEX_PROCESS_FAILED', exitCode:result.code, signal:result.signal, stderr:stderr.slice(-4000), capability:LLAMA_INDEX_CAPABILITY };
  try {
    const output=JSON.parse(stdout.trim()) as Record<string,unknown>;
    return { ...output, capability:LLAMA_INDEX_CAPABILITY, providerRevision:LLAMA_INDEX_REVISION };
  } catch {
    return { ...evidence, state:'FAIL', code:'LLAMA_INDEX_INVALID_RUNNER_OUTPUT', stdout:stdout.slice(-4000), stderr:stderr.slice(-4000), capability:LLAMA_INDEX_CAPABILITY };
  }
}
