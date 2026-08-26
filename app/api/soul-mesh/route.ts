import { NextResponse } from 'next/server';

type SoulMeshMessage = { protocol: string; id: string; correlationId: string; source: string; target: string; kind: 'request' | 'response' | 'event' | 'error' | 'ack'; capability: string; payload: unknown; timestamp: string | number };
const NUCLEUS_ID = 'N05';
const NUCLEI = new Set(['N01', 'N02', 'N03', 'N04', 'N05', 'N06']);

function valid(m: SoulMeshMessage) {
  return !!m && m.protocol === 'soul-mesh/1' && !!m.id && !!m.correlationId && NUCLEI.has(m.source) && NUCLEI.has(m.target) && m.target === NUCLEUS_ID && m.source !== NUCLEUS_ID && !!m.capability;
}

export async function POST(request: Request) {
  const token = process.env.SOUL_MESH_TOKEN;
  if (token && request.headers.get('authorization') !== `Bearer ${token}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const message = (await request.json().catch(() => null)) as SoulMeshMessage | null;
  if (!message || !valid(message)) return NextResponse.json({ error: 'INVALID_SOUL_MESH_MESSAGE' }, { status: 400 });
  if (message.kind !== 'request') return NextResponse.json({ accepted: true, correlationId: message.correlationId, source: NUCLEUS_ID, target: message.source });
  return NextResponse.json({ protocol: 'soul-mesh/1', id: crypto.randomUUID(), correlationId: message.correlationId, source: NUCLEUS_ID, target: message.source, kind: 'response', capability: message.capability, payload: { nucleus: NUCLEUS_ID, accepted: true, execution: 'runtime-required', receivedAt: Date.now() }, timestamp: Date.now() } satisfies SoulMeshMessage);
}
