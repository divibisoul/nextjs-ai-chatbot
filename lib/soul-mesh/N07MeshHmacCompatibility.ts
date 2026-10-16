import { createHmac } from 'node:crypto';
import type { SoulMeshMessage } from './SoulMeshProtocol';

function canonicalGoValue(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'string') {
    return JSON.stringify(value)
      .replace(/</g, '\\u003c')
      .replace(/>/g, '\\u003e')
      .replace(/&/g, '\\u0026')
      .replace(/\u2028/g, '\\u2028')
      .replace(/\u2029/g, '\\u2029');
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('N07_CANONICAL_NUMBER_INVALID');
    return JSON.stringify(value);
  }
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (Array.isArray(value)) return '[' + value.map(canonicalGoValue).join(',') + ']';
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).sort((left, right) =>
      Buffer.compare(Buffer.from(left, 'utf8'), Buffer.from(right, 'utf8')),
    );
    return '{' + keys.map(key => canonicalGoValue(key) + ':' + canonicalGoValue(record[key])).join(',') + '}';
  }
  throw new Error('N07_CANONICAL_VALUE_UNSUPPORTED');
}

function canonicalGoStruct(fields: ReadonlyArray<readonly [string, unknown]>): string {
  return '{' + fields.map(([key, value]) => canonicalGoValue(key) + ':' + canonicalGoValue(value)).join(',') + '}';
}

/**
 * N07's HTTP gateway authenticates header-HMAC requests against a Go struct
 * with an explicit field order, then encoding/json-sorted nested maps.
 * Do not replace this with JSON.stringify on a JavaScript object: integer-like
 * object keys are enumerated differently by JavaScript.
 */
export function signN07MeshRequest(message: SoulMeshMessage, nonce: string, secret: string): string {
  if (Buffer.byteLength(secret, 'utf8') < 32) throw new Error('SOUL_MESH_HMAC_SECRET_TOO_SHORT');
  const unsigned: ReadonlyArray<readonly [string, unknown]> = [
    ['protocol', message.protocol],
    ['contractVersion', message.contractVersion],
    ['id', message.id],
    ['correlationId', message.correlationId],
    ['source', message.source],
    ['target', message.target],
    ['kind', message.kind],
    ['capability', message.capability ?? ''],
    ['payload', message.payload],
    ['timestamp', message.timestamp],
    ['transport', message.meta?.transport ?? null],
    ['meta', message.meta ?? null],
    ['nonce', nonce],
  ];
  return createHmac('sha256', secret).update(canonicalGoStruct(unsigned), 'utf8').digest('hex');
}
