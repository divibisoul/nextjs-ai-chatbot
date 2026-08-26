import { NextResponse } from 'next/server';
import { handleMeshMessage } from '@/lib/soul-mesh/endpoint';
import { NUCLEUS_04_MESH_HANDLERS } from '@/lib/soul-mesh/Nucleus04MeshHandlers';
import type { SoulMeshMessage } from '@/lib/soul-mesh/SoulMeshProtocol';

function authorized(request: Request): boolean {
  const token = process.env.SOUL_MESH_TOKEN;
  return !token || request.headers.get('authorization') === `Bearer ${token}`;
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const message = (await request.json()) as SoulMeshMessage;
    return NextResponse.json(await handleMeshMessage(message, NUCLEUS_04_MESH_HANDLERS));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown mesh error' }, { status: 400 });
  }
}
