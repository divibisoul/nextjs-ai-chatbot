import { sendToNucleus, type MeshPeer } from './adapter';
import { N06_CAPABILITIES, type N06Capability } from './N06Contract';

export const N06_MESH_PEER: MeshPeer = { id: 'N06', url: '' };

export async function callN06(capability: N06Capability | string, payload: unknown, timeoutMs = 15000) {
  return sendToNucleus('N06', capability, payload, timeoutMs);
}
export const n06Describe = () => callN06('mesh.describe', { requestedBy: 'N05' });
export const n06Health = () => callN06('mesh.health', { requestedBy: 'N05' });
export const n06AiPilot = (payload: unknown) => callN06('ai-pilot', payload);
export const n06ToolExecution = (payload: unknown) => callN06('tool-execution', payload);
export const n06ArtifactProcessing = (payload: unknown) => callN06('artifact-processing', payload);
export const n06DocumentProcessing = (payload: unknown) => callN06('document-processing', payload);
export const n06ContextOrchestration = (payload: unknown) => callN06('context-orchestration', payload);
export const n06Streaming = (payload: unknown) => callN06('streaming', payload);
export const n06MeshCommunication = (payload: unknown) => callN06('mesh-communication', payload);
export function n06Capabilities() { return [...N06_CAPABILITIES]; }
