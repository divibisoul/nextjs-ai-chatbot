import { randomUUID } from 'node:crypto';
import { handleMeshMessage, SOUL_MESH_PROTOCOL, type NucleusId, type SoulMeshMessage } from './endpoint';

export const NUCLEUS_ID: NucleusId = 'N05';
export const NUCLEUS_VERSION = '1.0.0';

export type MeshHandler = (payload: unknown, message: SoulMeshMessage) => Promise<unknown> | unknown;

export type MeshPeer = {
  id: NucleusId;
  url: string;
};

const nucleusIds: NucleusId[] = ['N01', 'N02', 'N03', 'N04', 'N05', 'N06'];

function envUrl(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value.replace(/\/$/, '') : undefined;
}

export function getMeshPeers(): MeshPeer[] {
  const envNames: Record<NucleusId, string> = {
    N01: 'SOUL_MESH_N01_URL',
    N02: 'SOUL_MESH_N02_URL',
    N03: 'SOUL_MESH_N03_URL',
    N04: 'SOUL_MESH_N04_URL',
    N05: 'SOUL_MESH_N05_URL',
    N06: 'SOUL_MESH_N06_URL',
  };

  return nucleusIds
    .filter((id) => id !== NUCLEUS_ID)
    .map((id) => ({ id, url: envUrl(envNames[id]) }))
    .filter((peer): peer is MeshPeer => Boolean(peer.url));
}

export function createMeshRequest(target: NucleusId, capability: string, payload: unknown): SoulMeshMessage {
  if (target === NUCLEUS_ID) throw new Error('Mesh target must be a remote nucleus');

  const id = randomUUID();
  return {
    protocol: SOUL_MESH_PROTOCOL,
    id,
    correlationId: id,
    source: NUCLEUS_ID,
    target,
    kind: 'request',
    capability,
    payload,
    timestamp: new Date().toISOString(),
  };
}

export async function dispatchMeshMessage(
  message: SoulMeshMessage,
  handlers: Record<string, MeshHandler>,
): Promise<SoulMeshMessage> {
  return handleMeshMessage(message, NUCLEUS_ID, handlers) as Promise<SoulMeshMessage>;
}

export async function callNucleus(
  target: NucleusId,
  capability: string,
  payload: unknown,
  options: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<unknown> {
  const peer = getMeshPeers().find((candidate) => candidate.id === target);
  if (!peer) throw new Error(`MESH_PEER_NOT_CONFIGURED:${target}`);

  const message = createMeshRequest(target, capability, payload);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 15000);
  const signal = options.signal
    ? AbortSignal.any([options.signal, controller.signal])
    : controller.signal;

  try {
    const response = await fetch(`${peer.url}/api/soul-mesh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(message),
      signal,
      cache: 'no-store',
    });

    const body = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(`MESH_REMOTE_HTTP_${response.status}:${JSON.stringify(body)}`);
    }
    if (!body || body.protocol !== SOUL_MESH_PROTOCOL) {
      throw new Error('MESH_PROTOCOL_MISMATCH');
    }
    if (body.correlationId !== message.correlationId) {
      throw new Error('MESH_CORRELATION_MISMATCH');
    }
    if (body.kind === 'error') {
      throw new Error(`MESH_REMOTE_ERROR:${body.payload?.code ?? 'UNKNOWN'}`);
    }
    return body.payload;
  } finally {
    clearTimeout(timeout);
  }
}

export async function probeNucleus(target: NucleusId, timeoutMs = 5000): Promise<{
  id: NucleusId;
  reachable: boolean;
  latencyMs: number | null;
  error?: string;
}> {
  const started = Date.now();
  try {
    await callNucleus(target, 'mesh.ping', { from: NUCLEUS_ID }, { timeoutMs });
    return { id: target, reachable: true, latencyMs: Date.now() - started };
  } catch (error) {
    return {
      id: target,
      reachable: false,
      latencyMs: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function probeAllNuclei(timeoutMs = 5000) {
  return Promise.all(
    nucleusIds
      .filter((id) => id !== NUCLEUS_ID)
      .map((id) => probeNucleus(id, timeoutMs)),
  );
}
