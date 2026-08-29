export type SoulExecution = 'WEB_SESSION' | 'MESH_DELEGATION' | 'PARALLEL';
export type SoulLatencyClass = 'LOW' | 'MEDIUM' | 'HIGH';

export interface SoulCapability {
  id: string;
  execution: SoulExecution;
  owner: 'N05';
  consumers: string[];
  fallback?: string[];
  agents?: string[];
  tools?: string[];
  consumes?: string[];
  produces?: string[];
  latencyClass?: SoulLatencyClass;
  composable?: boolean;
}

export interface ComposedCapability extends SoulCapability {
  components: string[];
  composition: {
    capability: string[];
    agent: string[];
    tool: string[];
    context: string[];
    execution: string[];
    delegation: string[];
  };
}

const MESH_CONSUMERS = ['N01', 'N02', 'N03', 'N04', 'N06'];

export const SOUL_CAPABILITIES: Record<string, SoulCapability> = {
  chatReason: {
    id: 'chat.reason', execution: 'WEB_SESSION', owner: 'N05', consumers: MESH_CONSUMERS,
    agents: ['N05.inference'], consumes: ['text/plain', 'chat.context'], produces: ['text/plain', 'inference.result'], latencyClass: 'MEDIUM', composable: true,
  },
  history: {
    id: 'chat.history', execution: 'WEB_SESSION', owner: 'N05', consumers: ['N01', 'N02', 'N06'],
    agents: ['N05.context'], produces: ['chat.context'], latencyClass: 'LOW', composable: true,
  },
  tools: {
    id: 'chat.tools', execution: 'WEB_SESSION', owner: 'N05', consumers: ['N01', 'N02', 'N06'],
    agents: ['N05.tool-coordinator'], produces: ['tool.result'], latencyClass: 'LOW', composable: true,
  },
  inferenceSupport: {
    id: 'support.inference', execution: 'MESH_DELEGATION', owner: 'N05', consumers: MESH_CONSUMERS, fallback: ['N02'],
    agents: ['N05.inference'], consumes: ['text/plain', 'chat.context'], produces: ['text/plain', 'inference.result'], latencyClass: 'MEDIUM', composable: true,
  },
};

export function soulCapability(id: string): SoulCapability | undefined {
  return Object.values(SOUL_CAPABILITIES).find((capability) => capability.id === id);
}

export function canConsume(capabilityId: string, source: string): boolean {
  const capability = soulCapability(capabilityId);
  return Boolean(capability && capability.consumers.includes(source));
}

export function composeCapabilities(primaryId: string, supportingIds: string[]): ComposedCapability | undefined {
  const primary = soulCapability(primaryId);
  const supporting = supportingIds.map(soulCapability).filter(Boolean) as SoulCapability[];
  if (!primary || supporting.length === 0) return undefined;

  const components = [primary, ...supporting];
  const unique = (values: string[]) => Array.from(new Set(values));
  const capabilityIds = components.map((item) => item.id);
  const agents = unique(components.flatMap((item) => item.agents ?? []));
  const tools = unique(components.flatMap((item) => item.tools ?? []));
  const contexts = unique(components.flatMap((item) => item.consumes ?? []));
  const execution = unique(components.map((item) => item.execution));
  const delegation = unique(components.filter((item) => item.execution === 'MESH_DELEGATION').map((item) => item.id));

  return {
    id: `composed.${primary.id}`,
    execution: supporting.some((item) => item.execution === 'MESH_DELEGATION') ? 'MESH_DELEGATION' : primary.execution,
    owner: 'N05',
    consumers: unique(components.flatMap((item) => item.consumers)),
    fallback: unique(components.flatMap((item) => item.fallback ?? [])),
    agents,
    tools,
    consumes: contexts,
    produces: unique(components.flatMap((item) => item.produces ?? [])),
    latencyClass: primary.latencyClass ?? 'MEDIUM',
    composable: true,
    components: capabilityIds,
    composition: { capability: capabilityIds, agent: agents, tool: tools, context: contexts, execution, delegation },
  };
}
