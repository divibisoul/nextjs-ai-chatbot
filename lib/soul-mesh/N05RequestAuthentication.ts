import { createHmac, timingSafeEqual } from 'node:crypto';
import type { SoulMeshMessage } from './endpoint';
import { verifySoulMeshMessage } from './SoulMeshHmac';

/**
 * Validate inbound N05 request authentication.
 * Production requires the shared HMAC contract; the legacy body signature
 * remains available only to non-production migration/dev environments.
 */
export function verifyN05RequestSignature(
  rawBody: string,
  request: Request,
  message: SoulMeshMessage,
): boolean {
  const production = process.env.NODE_ENV === 'production';
  const hmacSecret = process.env.SOUL_MESH_HMAC_SECRET?.trim() ?? '';
  const nonce = request.headers.get('x-soul-mesh-nonce')?.trim() ?? '';
  const signature = request.headers.get('x-soul-mesh-hmac')?.trim() ?? '';

  if (production) {
    if (Buffer.byteLength(hmacSecret, 'utf8') < 32 || !nonce || !signature) return false;
    return verifySoulMeshMessage(message, hmacSecret, nonce, signature);
  }

  if (hmacSecret && nonce && signature) {
    return verifySoulMeshMessage(message, hmacSecret, nonce, signature);
  }

  const legacySecret = process.env.SOUL_MESH_SIGNING_SECRET;
  if (!legacySecret) return true;

  const provided = request.headers.get('x-soul-signature') ?? '';
  if (!provided) return false;
  const expected = createHmac('sha256', legacySecret).update(rawBody).digest();
  const actual = Buffer.from(provided, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
