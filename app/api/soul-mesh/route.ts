import { NextResponse } from 'next/server';
import type { SoulMeshMessage } from '@/lib/soul-mesh/endpoint';
import { handleMeshMessage } from '@/lib/soul-mesh/endpoint';

function authorized(request: Request): boolean {
  const token = process.env.SOUL_MESH_TOKEN;
  return !token || request.headers.get('authorization') === `Bearer ${token}`;
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  let message: SoulMeshMessage;
  try { message = (await request.json()) as SoulMeshMessage; }
  catch { return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 }); }
  try {
    const result = await handleMeshMessage(message);
    return NextResponse.json(result, { status: result.kind === 'error' ? 501 : 200 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'SOUL_MESH_ERROR' }, { status: 400 });
  }
}
