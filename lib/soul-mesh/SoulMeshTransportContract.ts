import type { SoulMeshMessage, SoulNucleus } from './SoulMeshProtocol';

/** Canonical transport contract for nucleus-to-nucleus communication.
 * Transport is deliberately provider/API agnostic. Implementations may be
 * local, Android/WebView, in-process, or another approved transport.
 */
export interface SoulMeshPeerTransport {
  readonly localNucleus: SoulNucleus;
  send(message: SoulMeshMessage): Promise<void>;
  onMessage(handler: (message: SoulMeshMessage) => void | Promise<void>): () => void;
}

export interface SoulMeshPeerDescriptor {
  nucleus: SoulNucleus;
  protocol: 'soul-mesh/1';
  inbound: boolean;
  outbound: boolean;
  capabilities: string[];
  transports: string[];
}

export const SOUL_MESH_PEERS: SoulNucleus[] = ['N01', 'N02', 'N03', 'N04', 'N05', 'N06'];
