import { NextResponse } from 'next/server';
import type { SoulMeshMessage } from '@/lib/soul-mesh/SoulMeshProtocol';

export async function POST(request: Request) {
  const message = (await request.json().catch(() => null)) as SoulMeshMessage | null;
  if (!message || message.protocol !== 'soul-mesh/1' || message.target !== 'chatbot') return NextResponse.json({ error: 'Invalid Soul Mesh message' }, { status: 400 });
  if (message.kind !== 'request') return NextResponse.json({ accepted: true, correlationId: message.correlationId, source: 'chatbot', target: message.source });
  return NextResponse.json({ protocol: 'soul-mesh/1', id: crypto.randomUUID(), correlationId: message.correlationId, source: 'chatbot', target: message.source, kind: 'response', capability: message.capability, payload: { nucleus: 'chatbot', capability: message.capability, processed: true, payload: message.payload }, timestamp: Date.now() } satisfies SoulMeshMessage);
}
