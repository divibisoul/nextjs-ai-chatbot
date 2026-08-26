import { NextResponse } from 'next/server';
import { NUCLEUS_ID, SOUL_MESH_PROTOCOL, type SoulMeshMessage, handleMeshMessage } from '@/lib/soul-mesh/endpoint';
import { probeAllPeers } from '@/lib/soul-mesh/adapter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function authorized(request: Request): boolean {
  const token = process.env.SOUL_MESH_TOKEN;
  return !token || request.headers.get('authorization') === `Bearer ${token}`;
}

const handlers = {
  'mesh.ping': (payload: unknown) => ({ ok: true, nucleus: NUCLEUS_ID, echoed: payload, processedAt: Date.now() }),
  'mesh.describe': () => ({
    nucleus: NUCLEUS_ID,
    protocol: SOUL_MESH_PROTOCOL,
    status: 'online',
    capabilities: ['mesh.ping', 'mesh.describe', 'core.health', 'mesh.topology'],
  }),
  'core.health': () => ({ ok: true, nucleus: NUCLEUS_ID, runtime: 'nextjs-ai-chatbot', timestamp: Date.now() }),
  'mesh.topology': () => probeAllPeers(),
};

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  return NextResponse.json({
    protocol: SOUL_MESH_PROTOCOL,
    nucleus: NUCLEUS_ID,
    status: 'online',
    capabilities: Object.keys(handlers),
    peers: await probeAllPeers(),
    timestamp: Date.now(),
  });
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  let message: SoulMeshMessage;
  try {
    message = (await request.json()) as SoulMeshMessage;
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 });
  }

  try {
    const result = await handleMeshMessage(message, handlers);
    return NextResponse.json(result, { status: result.kind === 'error' ? 501 : 200 });
  } catch (error) {
    return NextResponse.json({
      protocol: SOUL_MESH_PROTOCOL,
      id: message?.id,
      correlationId: message?.correlationId,
      source: NUCLEUS_ID,
      target: message?.source,
      kind: 'error',
      capability: message?.capability,
      payload: { code: 'SOUL_MESH_ERROR', detail: error instanceof Error ? error.message : 'Unknown error' },
      timestamp: Date.now(),
    }, { status: 400 });
  }
}
