import type { SoulMeshMessage } from './endpoint';
import { randomUUID } from 'crypto';

export const NUCLEUS_ID = 'N05' as const;
export const PEERS = ['N01', 'N02', 'N03', 'N04', 'N06'] as const;
export type N05Peer = (typeof PEERS)[number];

const urls: Record<N05Peer, string | undefined> = {
  N01: process.env.SOUL_MESH_N01_URL,
  N02: process.env.SOUL_MESH_N02_URL,
  N03: process.env.SOUL_MESH_N03_URL,
  N04: process.env.SOUL_MESH_N04_URL,
  N06: process.env.SOUL_MESH_N06_URL,
};

function assertResponse(message: SoulMeshMessage, response: SoulMeshMessage, target: N05Peer) {
  if (response.protocol !== message.protocol) throw new Error('SOUL_MESH_PROTOCOL_MISMATCH');
  if (response.correlationId !== message.correlationId) throw new Error('SOUL_MESH_CORRELATION_MISMATCH');
  if (response.source !== target || response.target !== NUCLEUS_ID) throw new Error('SOUL_MESH_ROUTE_MISMATCH');
}

export async function sendTo(target: N05Peer, capability: string, payload: unknown, timeoutMs = 15_000, retries = 1): Promise<SoulMeshMessage> {
  const url = urls[target];
  if (!url) throw new Error(`SOUL_MESH_PEER_URL_NOT_CONFIGURED:${target}`);
  if (!capability.trim()) throw new Error('SOUL_MESH_CAPABILITY_REQUIRED');

  const message: SoulMeshMessage = {
    protocol: 'soul-mesh/1',
    id: randomUUID(),
    correlationId: randomUUID(),
    source: NUCLEUS_ID,
    target,
    kind: 'request',
    capability,
    payload,
    timestamp: Date.now(),
    meta: { runtime: 'nextjs-ai-chatbot', transport: 'http-json', encoding: 'json', version: 'soul-mesh/1' },
  };

  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const token = process.env.SOUL_MESH_TOKEN;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(message),
        signal: controller.signal,
      });
      const body = await response.json() as SoulMeshMessage;
      assertResponse(message, body, target);
      if (!response.ok || body.kind === 'error') throw new Error(`SOUL_MESH_REMOTE_ERROR:${target}`);
      return body;
    } catch (error) {
      lastError = error;
      if (attempt < retries) await new Promise((resolve) => setTimeout(resolve, 150 * 2 ** attempt));
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

export const N05_OUT_CHANNELS = PEERS.map((peer) => `N05.OUT.${peer}`);
export const N05_IN_CHANNELS = PEERS.map((peer) => `N05.IN.${peer}`);
