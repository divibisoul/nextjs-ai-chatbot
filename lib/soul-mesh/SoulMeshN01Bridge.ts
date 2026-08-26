import { sendToNucleus, type MeshPeer } from './adapter';

/** Capabilities actually declared by N01's canonical Mesh registry. N01 remains the owner. */
export const N01_CAPABILITIES = [
  'mesh.handshake',
  'mesh.health',
  'mesh.capabilities',
  'cognitive.intent',
  'agi.process',
  'ai.reasoning',
  'android.device_info',
  'android.battery',
  'android.memory',
  'android.network',
] as const;

export type N01Capability = typeof N01_CAPABILITIES[number];

export type N01RemoteCapability = {
  id: N01Capability;
  owner: 'N01';
  direction: 'request' | 'event';
  execution: 'cognitive' | 'native' | 'observability';
};

export const N01_REMOTE_CAPABILITIES: N01RemoteCapability[] = [
  { id: 'mesh.handshake', owner: 'N01', direction: 'request', execution: 'observability' },
  { id: 'mesh.health', owner: 'N01', direction: 'request', execution: 'observability' },
  { id: 'mesh.capabilities', owner: 'N01', direction: 'request', execution: 'observability' },
  { id: 'cognitive.intent', owner: 'N01', direction: 'request', execution: 'cognitive' },
  { id: 'agi.process', owner: 'N01', direction: 'request', execution: 'cognitive' },
  { id: 'ai.reasoning', owner: 'N01', direction: 'request', execution: 'cognitive' },
  { id: 'android.device_info', owner: 'N01', direction: 'request', execution: 'native' },
  { id: 'android.battery', owner: 'N01', direction: 'request', execution: 'native' },
  { id: 'android.memory', owner: 'N01', direction: 'request', execution: 'native' },
  { id: 'android.network', owner: 'N01', direction: 'request', execution: 'native' },
];

export const N01_PEER_ROUTES = {
  inboundToN05: '/api/soul-mesh',
  outboundFromN05: '/api/soul-mesh',
} as const;

export async function invokeN01(capability: N01Capability, payload: unknown) {
  return sendToNucleus('N01', capability, payload);
}

export const n01DeviceInfo = (payload: unknown = {}) => invokeN01('android.device_info', payload);
export const n01Battery = (payload: unknown = {}) => invokeN01('android.battery', payload);
export const n01Memory = (payload: unknown = {}) => invokeN01('android.memory', payload);
export const n01Network = (payload: unknown = {}) => invokeN01('android.network', payload);
export const n01Intent = (payload: unknown) => invokeN01('cognitive.intent', payload);
export const n01AgiProcess = (payload: unknown) => invokeN01('agi.process', payload);
export const n01Reasoning = (payload: unknown) => invokeN01('ai.reasoning', payload);
export const n01Health = (payload: unknown = { probe: true }) => invokeN01('mesh.health', payload);
export const n01Capabilities = (payload: unknown = {}) => invokeN01('mesh.capabilities', payload);
export const n01Handshake = (payload: unknown = { nucleus: 'N05', protocol: 'soul-mesh/1' }) => invokeN01('mesh.handshake', payload);

export function n01PeerConfig(): MeshPeer | null {
  const url = process.env.SOUL_MESH_N01_URL?.trim().replace(/\/$/, '');
  return url ? { id: 'N01', url } : null;
}
