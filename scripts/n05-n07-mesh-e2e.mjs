import { createHmac, randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';

const IDS = ['N01', 'N02', 'N03', 'N04', 'N05', 'N06', 'N07'];
const PROTOCOL = 'soul-mesh/1';
const CONTRACT = '1.1.0';
const allMode = process.argv.includes('--all');
const hardwareMode = process.argv.includes('--hardware');

function parsePeers() {
  const raw = process.env.SOUL_MESH_PEERS?.trim() ?? '{}';
  try {
    const value = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('SOUL_MESH_PEERS_MUST_BE_OBJECT');
    return value;
  } catch (error) {
    throw new Error(`SOUL_MESH_PEERS_INVALID_JSON:${error instanceof Error ? error.message : String(error)}`);
  }
}

const peers = parsePeers();
const secret = process.env.SOUL_MESH_HMAC_SECRET?.trim() ?? '';
const token = process.env.SOUL_MESH_TOKEN?.trim() ?? '';
const timeoutMs = Number(process.env.SOUL_MESH_CHECK_TIMEOUT_MS ?? 5000);
const report = {
  system: 'SOUL',
  commissioner: 'N05',
  protocol: PROTOCOL,
  contractVersion: CONTRACT,
  mode: allMode ? 'ALL_DIRECTED_PAIRS' : 'N05_TO_N07',
  hardwareRequested: hardwareMode,
  semanticProbeOnly: true,
  state: 'DEGRADED',
  pairs: [],
};

function urlFor(id) {
  const value = peers?.[id];
  if (typeof value === 'string') return value.replace(/\/$/, '');
  if (value && typeof value.url === 'string') return value.url.replace(/\/$/, '');
  return '';
}

function authHeaders(message) {
  const headers = {
    'content-type': 'application/json',
    accept: 'application/json',
    'x-soul-correlation-id': message.correlationId,
  };
  if (secret) {
    headers['x-soul-mesh-nonce'] = message.meta.nonce;
    headers['x-soul-mesh-hmac'] = createHmac('sha256', secret).update(JSON.stringify(message), 'utf8').digest('hex');
  } else if (token) {
    headers.authorization = `Bearer ${token}`;
  }
  return headers;
}

function makeMessage(source, target) {
  const id = randomUUID();
  const correlationId = randomUUID();
  const nonce = randomUUID().replaceAll('-', '').padEnd(32, '0').slice(0, 32);
  return {
    protocol: PROTOCOL,
    contractVersion: CONTRACT,
    id,
    correlationId,
    source,
    target,
    kind: 'request',
    capability: 'mesh.ping',
    payload: { source, target, purpose: 'federated-mesh-semantic-probe' },
    timestamp: Date.now(),
    meta: { runtime: 'nextjs-ai-chatbot', transport: 'HTTP', encoding: 'json', version: CONTRACT, nonce, traceId: correlationId },
  };
}

async function probe(source, target) {
  const baseUrl = urlFor(target);
  const result = { source, target, capability: 'mesh.ping', status: 'DEGRADED', semanticProbe: true };
  if (!baseUrl) {
    result.reason = 'TARGET_URL_NOT_CONFIGURED';
    return result;
  }
  if (!secret && !token) {
    result.reason = 'SOUL_MESH_AUTH_NOT_CONFIGURED';
    return result;
  }
  const message = makeMessage(source, target);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = performance.now();
  try {
    const response = await fetch(`${baseUrl}/api/soul-mesh`, {
      method: 'POST',
      headers: authHeaders(message),
      body: JSON.stringify(message),
      cache: 'no-store',
      signal: controller.signal,
    });
    const body = await response.json().catch(() => null);
    result.httpStatus = response.status;
    result.latencyMs = Number((performance.now() - started).toFixed(3));
    result.responseCorrelationId = body?.correlationId ?? null;
    result.responseSource = body?.source ?? null;
    result.responseTarget = body?.target ?? null;
    result.responseProtocol = body?.protocol ?? null;
    result.responseContractVersion = body?.contractVersion ?? null;
    result.responseKind = body?.kind ?? null;
    const valid = response.ok
      && body?.protocol === PROTOCOL
      && body?.contractVersion === CONTRACT
      && body?.correlationId === message.correlationId
      && body?.source === target
      && body?.target === source;
    result.status = valid ? 'PASS' : 'FAILED';
    if (!valid) result.reason = 'MESH_SEMANTIC_RESPONSE_INVALID';
  } catch (error) {
    result.status = 'DEGRADED';
    result.reason = error instanceof Error ? error.message : String(error);
  } finally {
    clearTimeout(timer);
  }
  return result;
}

const pairs = [];
if (allMode) {
  for (const source of IDS) for (const target of IDS) if (source !== target) pairs.push([source, target]);
} else {
  pairs.push(['N05', 'N07']);
}

for (const [source, target] of pairs) {
  report.pairs.push(await probe(source, target));
}

const passed = report.pairs.filter((item) => item.status === 'PASS').length;
const failed = report.pairs.filter((item) => item.status === 'FAILED').length;
const degraded = report.pairs.filter((item) => item.status === 'DEGRADED').length;
report.summary = { totalPairs: report.pairs.length, passed, failed, degraded };
report.state = failed > 0 ? 'FAILED' : degraded > 0 ? 'DEGRADED' : 'PASS';
report.criterion = allMode ? '42 directed semantic Mesh probes' : 'N05->N07 semantic Mesh commissioning';
report.hardwareBinding = hardwareMode ? 'REQUESTED_BUT_NOT_PROVEN_BY_THIS_SCRIPT' : 'NOT_REQUESTED';

await fs.writeFile('N05-N07-E2E.json', `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(report, null, 2));
if (report.state === 'FAILED') process.exitCode = 1;
if (report.state === 'DEGRADED') process.exitCode = 2;
