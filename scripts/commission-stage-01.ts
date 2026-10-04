import { randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { createRequest } from '../lib/soul-mesh/peer-client';
import { createSoulMeshNonce, signSoulMeshMessage, verifySoulMeshResponse } from '../lib/soul-mesh/SoulMeshHmac';

const targetUrl = (process.env.SOUL_MESH_N06_URL ?? 'http://127.0.0.1:3001').replace(/\/$/, '');
const secret = (process.env.SOUL_MESH_HMAC_SECRET ?? '').trim();
const correlationId = process.env.SOUL_STAGE_CORRELATION_ID?.trim() || randomUUID();
const upstream = process.env.SOUL_STAGE_UPSTREAM_RESULT ? JSON.parse(process.env.SOUL_STAGE_UPSTREAM_RESULT) : { seed: true };
const request = createRequest('N06', 'support.context', { stage: 'N06_N05', upstream, requestedAt: new Date().toISOString() });
request.correlationId = correlationId;
request.meta = { ...(request.meta ?? {}), traceId: correlationId };
if (!secret) throw new Error('STAGE01_HMAC_SECRET_REQUIRED');
const nonce = createSoulMeshNonce();
request.nonce = nonce;
request.meta = { ...(request.meta ?? {}), nonce };
const hmac = signSoulMeshMessage(request, secret, nonce);

async function main() {
  const response = await fetch(targetUrl + '/api/soul-mesh', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json',
      'x-soul-correlation-id': correlationId,
      'x-soul-mesh-nonce': nonce,
      'x-soul-mesh-hmac': hmac,
      authorization: 'Bearer ' + (process.env.SOUL_MESH_TOKEN ?? 'ci-stage-token')
    },
    body: JSON.stringify(request)
  });
  const body = await response.json();
  if (!response.ok) throw new Error('N05_TO_N06_HTTP_' + response.status);
  if (body.source !== 'N06' || body.target !== 'N05' || body.correlationId !== correlationId) throw new Error('STAGE01_N05_TO_N06_ROUTE_OR_CORRELATION_INVALID');
  if (!verifySoulMeshResponse(request, body, secret)) throw new Error('STAGE01_N05_TO_N06_RESPONSE_HMAC_INVALID');
  if (body.kind !== 'response') throw new Error('STAGE01_N05_TO_N06_NOT_RESPONSE');
  const evidence = { state: 'REAL', direction: 'N05->N06', capability: request.capability, correlationId, responseMessageId: body.id, payload: body.payload };
  console.log(JSON.stringify(evidence));
  if (process.env.SOUL_STAGE_OUTPUT) writeFileSync(process.env.SOUL_STAGE_OUTPUT, JSON.stringify(body.payload));
  return body.payload;
}

main().catch(error => { console.error(error); process.exit(1); });