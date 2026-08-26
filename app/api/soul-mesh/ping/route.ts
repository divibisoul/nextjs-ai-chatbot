import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { source?: string; correlationId?: string; nonce?: string } | null;
  const nuclei = new Set(['N01', 'N02', 'N03', 'N04', 'N05', 'N06']);
  if (!body?.source || !body.correlationId || !nuclei.has(body.source) || body.source === 'N05') return NextResponse.json({ ok: false, error: 'INVALID_MESH_PING' }, { status: 400 });
  return NextResponse.json({ ok: true, protocol: 'soul-mesh/1', source: 'N05', target: body.source, capability: 'mesh.ping', correlationId: body.correlationId, nonce: body.nonce ?? null, timestamp: Date.now() });
}
