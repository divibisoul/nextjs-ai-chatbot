import { createHmac, randomUUID } from 'node:crypto';
import { verifyCanonicalSoulMeshResponse, verifySoulMeshResponse } from './SoulMeshHmac';
import { signN07MeshRequest } from './N07MeshHmacCompatibility';
import type { SoulMeshMessage } from './SoulMeshProtocol';
import { createSoulMeshMessage, SOUL_MESH_PROTOCOL } from './SoulMeshProtocol';

export const NUCLEUS_ID = 'N05' as const;
export const PEERS = ['N01', 'N02', 'N03', 'N04', 'N06', 'N07'] as const;
export type N05Peer = (typeof PEERS)[number];

const urls: Record<N05Peer, string | undefined> = {
  N01: process.env.SOUL_MESH_N01_URL,
  N02: process.env.SOUL_MESH_N02_URL,
  N03: process.env.SOUL_MESH_N03_URL,
  N04: process.env.SOUL_MESH_N04_URL,
  N06: process.env.SOUL_MESH_N06_URL,
  N07: process.env.SOUL_MESH_N07_URL,
};

function nonce(): string { return randomUUID().replaceAll('-', '').padEnd(32, '0').slice(0, 32); }
function canonical(message: SoulMeshMessage, nonceValue: string): string {
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
    nonce: nonceValue,
  });
}
function hmac(message: SoulMeshMessage, nonceValue: string, secret: string): string {
  if (Buffer.byteLength(secret, 'utf8') < 32) throw new Error('SOUL_MESH_HMAC_SECRET_TOO_SHORT');
  return createHmac('sha256', secret).update(canonical(message, nonceValue), 'utf8').digest('hex');
}

function assertResponse(message: SoulMeshMessage, response: SoulMeshMessage, target: N05Peer) {
  if (response.protocol !== SOUL_MESH_PROTOCOL) throw new Error('SOUL_MESH_PROTOCOL_MISMATCH');
  if (response.contractVersion !== message.contractVersion) throw new Error('SOUL_MESH_CONTRACT_VERSION_MISMATCH');
  if (typeof response.id !== 'string' || !response.id.trim()) throw new Error('SOUL_MESH_RESPONSE_ID_REQUIRED');
  if (response.correlationId !== message.correlationId) throw new Error('SOUL_MESH_CORRELATION_MISMATCH');
  if (response.source !== target || response.target !== NUCLEUS_ID) throw new Error('SOUL_MESH_ROUTE_MISMATCH');
  if (response.capability !== message.capability) throw new Error('SOUL_MESH_CAPABILITY_MISMATCH');
  if (response.kind !== 'response' && response.kind !== 'error') throw new Error('SOUL_MESH_INVALID_RESPONSE_KIND');
  if (!Number.isFinite(response.timestamp) || Math.abs(Date.now() - response.timestamp) > 30_000) {
    throw new Error('SOUL_MESH_RESPONSE_TIMESTAMP_INVALID');
  }
}

const RETRY_SAFE_CAPABILITIES = new Set([
  'mesh.ping',
  'mesh.health',
  'mesh.describe',
  'mesh.handshake',
  'mesh.capabilities',
  'mesh.resident.describe@1.0.0',
  'core.health',
]);

function retryablePeerFailure(error: unknown): boolean {
  if (error instanceof TypeError) return true;
  if (error instanceof Error && error.name === 'AbortError') return true;
  return error instanceof Error
    && /^SOUL_MESH_REMOTE_ERROR:[^:]+:(?:429|5\d\d)$/.test(error.message);
}

export async function sendTo(
  target: N05Peer,
  capability: string,
  payload: unknown,
  timeoutMs = 15_000,
  retries = 1,
): Promise<SoulMeshMessage> {
  const url = urls[target];
  if (!url) throw new Error(`SOUL_MESH_PEER_URL_NOT_CONFIGURED:${target}`);
  const normalizedCapability = capability.trim();
  if (!normalizedCapability) throw new Error('SOUL_MESH_CAPABILITY_REQUIRED');

  const secret = process.env.SOUL_MESH_HMAC_SECRET?.trim() ?? '';
  const token = process.env.SOUL_MESH_TOKEN?.trim() ?? '';
  const production = process.env.NODE_ENV === 'production';
  if (production && Buffer.byteLength(secret, 'utf8') < 32) {
    throw new Error(`SOUL_MESH_HMAC_NOT_CONFIGURED:${target}`);
  }
  if (production && !token) throw new Error(`SOUL_MESH_BEARER_TOKEN_NOT_CONFIGURED:${target}`);
  if (secret && Buffer.byteLength(secret, 'utf8') < 32) throw new Error('SOUL_MESH_HMAC_SECRET_TOO_SHORT');

  const correlationId = randomUUID();
  const baseMessage = createSoulMeshMessage({
    source: NUCLEUS_ID,
    target,
    kind: 'request',
    capability: normalizedCapability,
    payload,
    correlationId,
    meta: { runtime: 'nextjs-ai-chatbot', transport: 'HTTP', encoding: 'json', version: '1.1.0', traceId: correlationId },
  });
  const maxAttempts = RETRY_SAFE_CAPABILITIES.has(normalizedCapability)
    ? Math.min(3, Math.max(0, Math.floor(retries))) + 1
    : 1;

  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const nonceValue = nonce();
      const message: SoulMeshMessage = {
        ...baseMessage,
        timestamp: Date.now(),
        nonce: nonceValue,
        meta: { ...(baseMessage.meta ?? {}), nonce: nonceValue },
      };
      const headers: Record<string, string> = {
        'content-type': 'application/json',
        accept: 'application/json',
        'x-soul-correlation-id': correlationId,
      };
      if (token) headers.authorization = `Bearer ${token}`;
      if (secret) {
        headers['x-soul-mesh-nonce'] = nonceValue;
        headers['x-soul-mesh-hmac'] = target === 'N07'
          ? signN07MeshRequest(message, nonceValue, secret)
          : hmac(message, nonceValue, secret);
      }

      const response = await fetch(`${url.replace(/\/$/, '')}/api/soul-mesh`, {
        method: 'POST',
        headers,
        body: JSON.stringify(message),
        signal: controller.signal,
        cache: 'no-store',
      });
      const rawBody: unknown = await response.json().catch(() => null);
      if (!rawBody || typeof rawBody !== 'object') throw new Error('SOUL_MESH_INVALID_RESPONSE_BODY');
      const body = rawBody as SoulMeshMessage & { nonce?: string; hmac?: string };
      assertResponse(message, body, target);
      if (production && !secret) throw new Error(`SOUL_MESH_RESPONSE_HMAC_NOT_CONFIGURED:${target}`);
      if (secret) {
        const responseNonce = String(body.nonce ?? body.meta?.nonce ?? '').trim();
        const responseHmac = String(body.hmac ?? '').trim();
        const validResponse = message.target === 'N07'
          ? verifySoulMeshResponse(message, body, secret, responseNonce, responseHmac)
          : verifyCanonicalSoulMeshResponse(message, body, secret);
        if (!validResponse) throw new Error('SOUL_MESH_RESPONSE_HMAC_INVALID');
      }
      if (!response.ok || body.kind === 'error') {
        throw new Error(`SOUL_MESH_REMOTE_ERROR:${target}:${response.status}`);
      }
      return body;
    } catch (error) {
      lastError = error;
      if (attempt + 1 >= maxAttempts || !retryablePeerFailure(error)) throw error;
      await new Promise(resolve => setTimeout(resolve, 150 * 2 ** attempt));
    } finally {
      clearTimeout(timer);
    }
  }
  return Promise.reject(lastError instanceof Error ? lastError : new Error(`SOUL_MESH_REQUEST_FAILED:${target}`));
}
export async function requestPeerCapability(target: N05Peer, capability: string, payload: unknown, timeoutMs?: number) {
  return sendTo(target, capability, payload, timeoutMs);
}

export async function describePeer(target: N05Peer, timeoutMs?: number) {
  return sendTo(target, 'mesh.describe', {}, timeoutMs);
}

export const N05_OUT_CHANNELS = PEERS.map(peer => `N05.OUT.${peer}`);
export const N05_IN_CHANNELS = PEERS.map(peer => `N05.IN.${peer}`);
