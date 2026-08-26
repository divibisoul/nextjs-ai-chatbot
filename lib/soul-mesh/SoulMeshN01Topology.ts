import { SOUL_MESH_PEERS } from './SoulMeshPeerMatrix';

/** N01 is the reference connectivity nucleus. These are the five bidirectional peer links declared by N01. */
export const N01_PEERS = ['N02', 'N03', 'N04', 'N05', 'N06'] as const;
export type N01Peer = typeof N01_PEERS[number];

export const N01_BIDIRECTIONAL_ROUTES = N01_PEERS.flatMap((peer) => [
  { source: 'N01' as const, target: peer, direction: 'out' as const, enabled: true },
  { source: peer, target: 'N01' as const, direction: 'in' as const, enabled: true },
]);

export const N01_REFERENCE_TRANSPORT = {
  protocol: 'soul-mesh/1' as const,
  transport: 'http-json' as const,
  timeoutMs: 15_000,
  maxRetries: 3,
};

export function isN01Peer(value: string): value is N01Peer {
  return (N01_PEERS as readonly string[]).includes(value);
}

// Keep the canonical N05 matrix and N01 reference topology mechanically comparable.
export const N05_PEER_SET_MATCHES_N01 = N01_PEERS.every((peer) => SOUL_MESH_PEERS.includes(peer));
