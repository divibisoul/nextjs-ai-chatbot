import { sendSoulMeshMessage } from './SoulMeshClient';
import { SOUL_MESH_PEERS, type SoulNucleusId } from './SoulMeshTopology';
import type { SoulMeshMessage } from './SoulMeshProtocol';

export const SOUL_MESH_ENDPOINT_ENV: Record<SoulNucleusId, string> = {
  N01: 'SOUL_MESH_N01_URL', N02: 'SOUL_MESH_N02_URL', N03: 'SOUL_MESH_N03_URL',
  N04: 'SOUL_MESH_N04_URL', N05: 'SOUL_MESH_N05_URL', N06: 'SOUL_MESH_N06_URL',
};

function endpointFor(peer: SoulNucleusId) {
  const endpoint = process.env[SOUL_MESH_ENDPOINT_ENV[peer]];
  if (!endpoint) throw new Error(`SOUL_MESH_ENDPOINT_NOT_CONFIGURED:${peer}`);
  return endpoint;
}

export async function sendToPeer(message: SoulMeshMessage, token = process.env.SOUL_MESH_TOKEN) {
  if (!SOUL_MESH_PEERS.N04.includes(message.target)) throw new Error(`INVALID_N04_PEER:${message.target}`);
  return sendSoulMeshMessage(endpointFor(message.target), message, token);
}
