import { createHmac, randomUUID } from 'node:crypto';

const url = (process.env.SOUL_N07_URL ?? '').trim().replace(/\/$/, '');
const secret = (process.env.SOUL_MESH_HMAC_SECRET ?? '').trim();
const correlationId = `n05-real-${randomUUID()}`;

if (!url) throw new Error('SOUL_N07_URL is required');
if (!secret || secret.length < 16) throw new Error('SOUL_MESH_HMAC_SECRET must contain at least 16 characters');

const id = randomUUID();
const nonce = randomUUID();
const payload = { values: [2, 3, 5, 7] };
const timestamp = Date.now();
const unsigned = JSON.stringify({
  protocol: 'soul-mesh/1',
  contractVersion: '1.1.0',
  id,
  correlationId,
  source: 'N05',
  target: 'N07',
  kind: 'request',
  capability: 'neural.forward',
  payload,
  timestamp,
  transport: null,
  meta: null,
  nonce,
});
const hmac = createHmac('sha256', secret).update(unsigned, 'utf8').digest('hex');

const response = await fetch(`${url}/api/soul-mesh`, {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'x-soul-contract-version': '1.1.0',
    'x-soul-correlation-id': correlationId,
    'x-soul-mesh-nonce': nonce,
    'x-soul-mesh-hmac': hmac,
  },
  body: JSON.stringify({
    protocol: 'soul-mesh/1',
    contractVersion: '1.1.0',
    id,
    correlationId,
    source: 'N05',
    target: 'N07',
    kind: 'request',
    capability: 'neural.forward',
    payload,
    timestamp,
    nonce,
    hmac,
  }),
});

const body = await response.json();
if (response.status !== 200) throw new Error(`HTTP ${response.status}: ${JSON.stringify(body)}`);
if (body.protocol !== 'soul-mesh/1') throw new Error('protocol mismatch');
if (body.contractVersion !== '1.1.0') throw new Error('contract mismatch');
if (body.source !== 'N07' || body.target !== 'N05') throw new Error('source/target mismatch');
if (body.correlationId !== correlationId) throw new Error('correlationId mismatch');
const responseNonce = response.headers.get('x-soul-mesh-nonce') ?? body.nonce ?? '';
const responseHmac = response.headers.get('x-soul-mesh-hmac') ?? body.hmac ?? '';
if (!responseNonce || !responseHmac) throw new Error('N07 response HMAC credentials missing');

const canonicalResponse = JSON.stringify({
  version: '1.0',
  contractVersion: '1.1.0',
  messageId: String(body.id ?? body.messageId ?? ''),
  source: 'N07',
  target: 'N05',
  timestamp: Number(body.timestamp ?? 0),
  nonce: responseNonce,
  correlationId,
  type: body.kind === 'error' ? 'ERROR' : 'TASK_RESULT',
  payload: {
    capability: String(body.capability ?? ''),
    payload: body.payload ?? {},
  },
});
const expectedResponseHmac = createHmac('sha256', secret).update(canonicalResponse, 'utf8').digest('hex');
if (expectedResponseHmac !== responseHmac) throw new Error('N07 response HMAC mismatch');

console.log(JSON.stringify({
  status: 'PASS',
  source: 'N05',
  target: 'N07',
  http: response.status,
  correlationId,
  contractVersion: '1.1.0',
  hmac: 'verified',
  responseHmac: 'verified',
  timestamp: new Date().toISOString(),
}, null, 2));
