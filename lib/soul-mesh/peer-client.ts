import { createHmac, randomUUID } from 'node:crypto';
import type { SoulMeshMessage } from './SoulMeshProtocol';
import { createSoulMeshMessage, SOUL_MESH_PROTOCOL } from './SoulMeshProtocol';
import { N05_PEERS, type N05Peer } from './N05ChannelMatrix';

export const NUCLEUS_ID = 'N05' as const;
export const PEERS = N05_PEERS;

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
    meta: message.meta ?? null,
    nonce: nonceValue,
  });
}
function hmac(message: SoulMeshMessage, nonceValue: string, secret: string): string {
  return createHmac('sha256', secret).update(canonical(message, nonceValue), 'utf8').digest('hex');
}

function assertResponse(message: SoulMeshMessage, response: SoulMeshMessage, target: N05Peer) {
  if (response.protocol !== SOUL_MESH_PROTOCOL) throw new Error('SOUL_MESH_PROTOCOL_MISMATCH');
  if (response.contractVersion !== message.contractVersion) throw new Error('SOUL_MESH_CONTRACT_VERSION_MISMATCH');
  if (response.correlationId !== message.correlationId) throw new Error('SOUL_MESH_CORRELATION_MISMATCH');
  if (response.source !== target || response.target !== NUCLEUS_ID) throw new Error('SOUL_MESH_ROUTE_MISMATCH');
}

export async function sendTo(target: N05Peer, capability: string, payload: unknown, timeoutMs = 15_000, retries = 1): Promise<SoulMeshMessage> {
  const url = urls[target];
  if (!url) throw new Error(`SOUL_MESH_PEER_URL_NOT_CONFIGURED:${target}`);
  if (!capability.trim()) throw new Error('SOUL_MESH_CAPABILITY_REQUIRED');

  const correlationId = randomUUID();
  const nonceValue = nonce();
  const message = createSoulMeshMessage({
    source: NUCLEUS_ID,
    target,
    kind: 'request',
    capability,
    payload,
    correlationId,
    meta: { runtime: 'nextjs-ai-chatbot', transport: 'HTTP', encoding: 'json', version: '1.1.0', nonce: nonceValue, traceId: correlationId },
  });

  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const secret = process.env.SOUL_MESH_HMAC_SECRET?.trim() ?? '';
      const token = process.env.SOUL_MESH_TOKEN?.trim() ?? '';
      const headers: Record<string, string> = {
        'content-type': 'application/json',
        accept: 'application/json',
        'x-soul-correlation-id': correlationId,
      };
      if (secret) {
        headers['x-soul-mesh-nonce'] = nonceValue;
        headers['x-soul-mesh-hmac'] = hmac(message, nonceValue, secret);
      } else if (token) {
        headers.authorization = 'Bearer ' + token;
      }
      const response = await fetch(`${url.replace(/\/$/, '')}/api/soul-mesh`, {
        method: 'POST', headers, body: JSON.stringify(message), signal: controller.signal, cache: 'no-store',
      });
      const body = await response.json() as SoulMeshMessage;
      assertResponse(message, body, target);
      if (!response.ok || body.kind === 'error') throw new Error(`SOUL_MESH_REMOTE_ERROR:${target}:${response.status}`);
      return body;
    } catch (error) {
      lastError = error;
      if (attempt < retries) await new Promise(resolve => setTimeout(resolve, 150 * 2 ** attempt));
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`SOUL_MESH_REQUEST_FAILED:${target}`);
}

export async function requestPeerCapability(target: N05Peer, capability: string, payload: unknown, timeoutMs?: number) {
  return sendTo(target, capability, payload, timeoutMs);
}

export async function describePeer(target: N05Peer, timeoutMs?: number) {
  return sendTo(target, 'mesh.describe', {}, timeoutMs);
}

export const N05_OUT_CHANNELS = [...N05_PEERS].map(peer => `N05.OUT.${peer}`);
export const N05_IN_CHANNELS = [...N05_PEERS].map(peer => `N05.IN.${peer}`);
