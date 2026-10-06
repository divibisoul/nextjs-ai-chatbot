import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const production = process.env.NODE_ENV === 'production';
  const meshAuthConfigured = Boolean(
    process.env.SOUL_MESH_HMAC_SECRET?.trim() || process.env.SOUL_MESH_TOKEN?.trim(),
  );
  const ready = !production || meshAuthConfigured;
  return NextResponse.json(
    {
      ready,
      nucleus: 'N05',
      protocol: 'soul-mesh/1',
      contractVersion: '1.1.0',
      checks: {
        process: true,
        meshAuthConfigured,
      },
      evidenceState: 'REAL',
    },
    { status: ready ? 200 : 503 },
  );
}
