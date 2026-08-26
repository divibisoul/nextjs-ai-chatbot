import { NextResponse } from 'next/server';
import { NUCLEUS_ID, SOUL_MESH_PROTOCOL } from '@/lib/soul-mesh/endpoint';
import { SOUL_MESH_CAPABILITIES } from '@/lib/soul-mesh/SoulMeshCapabilities';
import { soulInferenceCapabilities } from '@/lib/soul-mesh/SoulMeshAI';

function authorized(request: Request): boolean {
  const token = process.env.SOUL_MESH_TOKEN;
  if (process.env.NODE_ENV === 'production') return Boolean(token) && request.headers.get('authorization') === `Bearer ${token}`;
  return !token || request.headers.get('authorization') === `Bearer ${token}`;
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  return NextResponse.json({
    protocol: SOUL_MESH_PROTOCOL,
    nucleus: NUCLEUS_ID,
    status: 'ready',
    runtime: 'nextjs-ai-chatbot',
    aiProviderConfigured: Boolean(process.env.XAI_API_KEY),
    capabilities: SOUL_MESH_CAPABILITIES,
    models: soulInferenceCapabilities(),
    timestamp: Date.now(),
  });
}
