import { createHmac, randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';

const baseUrl = process.env.SOUL_MESH_N07_URL?.trim() ?? '';
const secret = process.env.SOUL_MESH_HMAC_SECRET?.trim() ?? '';
const token = process.env.SOUL_MESH_TOKEN?.trim() ?? '';
const report = { system: 'SOUL', source: 'N05', target: 'N07', state: 'DEGRADED', protocol: 'soul-mesh/1', contractVersion: '1.1.0' };

if (!baseUrl) {
  report.reason = 'SOUL_MESH_N07_URL_NOT_CONFIGURED';
  await fs.writeFile('N05-N07-E2E.json', `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  process.exitCode = 2;
} else {
  const id = randomUUID();
  const correlationId = randomUUID();
  const nonce = randomUUID().replaceAll('-', '').padEnd(32, '0').slice(0, 32);
  const timestamp = Date.now();
  const message = {
    protocol: 'soul-mesh/1',
    contractVersion: '1.1.0',
    id,
    correlationId,
    source: 'N05',
    target: 'N07',
    kind: 'request',
    capability: 'mesh.ping',
    payload: { source: 'N05', purpose: 'lei-zero-topology-validation' },
    timestamp,
    meta: { runtime: 'nextjs-ai-chatbot', transport: 'HTTP', encoding: 'json', version: '1.1.0', nonce, traceId: correlationId },
  };
  const canonical = JSON.stringify({ ...message, nonce });
  const headers = { 'content-type': 'application/json', accept: 'application/json', 'x-soul-correlation-id': correlationId };
  if (secret) {
    headers['x-soul-mesh-nonce'] = nonce;
    headers['x-soul-mesh-hmac'] = createHmac('sha256', secret).update(canonical, 'utf8').digest('hex');
  } else if (token) {
    headers.authorization = `Bearer ${token}`;
  } else {
    report.state = 'DEGRADED';
    report.reason = 'SOUL_MESH_AUTH_NOT_CONFIGURED';
  }

  if (report.state !== 'DEGRADED' || report.reason !== 'SOUL_MESH_AUTH_NOT_CONFIGURED') {
    try {
      const response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/soul-mesh`, { method: 'POST', headers, body: JSON.stringify(message), cache: 'no-store' });
      const body = await response.json();
      report.httpStatus = response.status;
      report.responseKind = body?.kind;
      report.responseCorrelationId = body?.correlationId;
      report.state = response.ok && body?.kind !== 'error' && body?.correlationId === correlationId ? 'PASS' : 'FAIL';
      if (report.state === 'FAIL') report.reason = 'N05_N07_HANDSHAKE_OR_PING_FAILED';
    } catch (error) {
      report.state = 'DEGRADED';
      report.reason = error instanceof Error ? error.message : String(error);
    }
  }
  await fs.writeFile('N05-N07-E2E.json', `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  if (report.state === 'FAIL') process.exitCode = 1;
  if (report.state === 'DEGRADED') process.exitCode = 2;
}
