import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { SoulMeshMessage } from './SoulMeshProtocol';

const MAX_CLOCK_SKEW_MS = 30_000;

function canonicalize(message: SoulMeshMessage, nonce: string): string {
  return JSON.stringify({
    protocol: message.protocol,
    contractVersion: message.contractVersion,
    id: message.id,
    correlationId: message.correlationId,
    source: message.source,
    target: message.target,
    kind: message.kind,
    capability: message.capability ?? null,
    payload: message.payload,
    timestamp: message.timestamp,
    transport: message.meta?.transport,
    meta: message.meta ?? null,
    nonce,
  });
}

export function createSoulMeshNonce(): string {
  return randomBytes(24).toString('base64url');
}

export function signSoulMeshMessage(message: SoulMeshMessage, secret: string, nonce: string): string {
  if (!secret) throw new Error('SOUL_MESH_HMAC_SECRET_MISSING');
  return createHmac('sha256', secret).update(canonicalize(message, nonce), 'utf8').digest('hex');
}

export function verifySoulMeshMessage(message: SoulMeshMessage, secret: string, nonce: string, hmac: string, now = Date.now()): boolean {
  if (!secret || !nonce || !hmac || !Number.isFinite(message.timestamp)) return false;
  if (Math.abs(now - message.timestamp) > MAX_CLOCK_SKEW_MS) return false;
  const expected = signSoulMeshMessage(message, secret, nonce);
  const actual = Buffer.from(hmac, 'hex');
  const wanted = Buffer.from(expected, 'hex');
  return actual.length === wanted.length && timingSafeEqual(actual, wanted);
}


export function signSoulMeshResponse(
  request: SoulMeshMessage,
  payload: unknown,
  kind: 'response' | 'error',
  secret: string,
): { message: SoulMeshMessage; nonce: string; hmac: string } {
  if (!secret) throw new Error('SOUL_MESH_HMAC_SECRET_MISSING');
  const message: SoulMeshMessage = {
    protocol: 'soul-mesh/1',
    contractVersion: '1.1.0',
    id: randomBytes(16).toString('hex'),
    correlationId: request.correlationId,
    source: request.target,
    target: request.source,
    kind,
    capability: request.capability,
    payload,
    timestamp: Date.now(),
    meta: {
      runtime: 'nextjs-ai-chatbot',
      transport: 'HTTP',
      encoding: 'json',
      version: request.contractVersion,
      traceId: request.meta?.traceId ?? request.correlationId,
    },
  };
  const nonce = createSoulMeshNonce();
  const canonical = JSON.stringify({
    version: '1.0',
    contractVersion: message.contractVersion,
    messageId: message.id,
    source: message.source,
    target: message.target,
    timestamp: message.timestamp,
    nonce,
    correlationId: message.correlationId,
    type: kind === 'error' ? 'ERROR' : 'TASK_RESULT',
    payload: { capability: message.capability ?? '', payload: message.payload ?? {} },
  });
  const hmac = digest(canonical, secret);
  return { message, nonce, hmac };
}

export function verifySoulMeshResponse(
  request: SoulMeshMessage,
  response: SoulMeshMessage & { nonce?: string; hmac?: string },
  secret: string,
  nonce = response.nonce ?? response.meta?.nonce ?? '',
  hmacValue = response.hmac ?? '',
  now = Date.now(),
): boolean {
  if (!secret || !nonce || !hmacValue) return false;
  if (response.correlationId !== request.correlationId) return false;
  if (response.source !== request.target || response.target !== request.source) return false;
  if (response.kind !== 'response' && response.kind !== 'error') return false;
  if (!Number.isFinite(response.timestamp) || Math.abs(now - response.timestamp) > MAX_CLOCK_SKEW_MS) return false;
  const canonical = JSON.stringify({
    version: '1.0',
    contractVersion: response.contractVersion,
    messageId: response.id,
    source: response.source,
    target: response.target,
    timestamp: response.timestamp,
    nonce,
    correlationId: response.correlationId,
    type: response.kind === 'error' ? 'ERROR' : 'TASK_RESULT',
    payload: { capability: response.capability ?? '', payload: response.payload ?? {} },
  });
  try {
    const expected = createHmac('sha256', secret).update(canonical, 'utf8').digest('hex');
    if (!/^[0-9a-f]{64}$/i.test(hmacValue)) return false;
    const actual = Buffer.from(hmacValue, 'hex');
    const wanted = Buffer.from(expected, 'hex');
    return actual.length === wanted.length && timingSafeEqual(actual, wanted);
  } catch {
    return false;
  }
}
