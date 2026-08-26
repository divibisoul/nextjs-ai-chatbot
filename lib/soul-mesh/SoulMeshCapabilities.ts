export type SoulMeshCapability = {
  id: string;
  version: string;
  description: string;
  request: boolean;
  response: boolean;
  events: boolean;
};

export const SOUL_MESH_CAPABILITIES: SoulMeshCapability[] = [
  { id: 'mesh.ping', version: '1.0', description: 'Connectivity and liveness probe', request: true, response: true, events: false },
  { id: 'mesh.describe', version: '1.0', description: 'Runtime, protocol and capability discovery', request: true, response: true, events: false },
  { id: 'core.health', version: '1.0', description: 'N05 runtime health and readiness', request: true, response: true, events: false },
  { id: 'mesh.topology', version: '1.0', description: 'Peer reachability and latency discovery', request: true, response: true, events: true },
  { id: 'ai.infer', version: '1.0', description: 'Provider-agnostic text inference executed by the N05 AI runtime', request: true, response: true, events: false },
  { id: 'conversation', version: '1.0', description: 'Conversational services exposed by N05', request: true, response: true, events: true },
  { id: 'tool-execution', version: '1.0', description: 'Execution of N05 AI tools through an authorized runtime adapter', request: true, response: true, events: false },
  { id: 'artifact-processing', version: '1.0', description: 'Artifact creation and processing services', request: true, response: true, events: true },
  { id: 'document-processing', version: '1.0', description: 'Document creation and update services', request: true, response: true, events: true },
  { id: 'context-orchestration', version: '1.0', description: 'Context-aware orchestration for N05', request: true, response: true, events: true },
  { id: 'streaming', version: '1.0', description: 'Streaming-capable AI response services', request: true, response: true, events: true },
];
