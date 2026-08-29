export type SoulExecution = 'WEB_SESSION' | 'MESH_DELEGATION';

export interface SoulCapability {
  id: string;
  execution: SoulExecution;
  consumes?: string[];
  produces?: string[];
  latencyClass?: 'LOW' | 'MEDIUM' | 'HIGH';
}

export const SOUL_CAPABILITIES: Record<string, SoulCapability> = {
  chatReason: { id: 'chat.reason', execution: 'WEB_SESSION', consumes: ['text/plain', 'chat.context'], produces: ['text/plain'], latencyClass: 'MEDIUM' },
  history: { id: 'chat.history', execution: 'WEB_SESSION', produces: ['chat.context'], latencyClass: 'LOW' },
  tools: { id: 'chat.tools', execution: 'WEB_SESSION', produces: ['tool.result'], latencyClass: 'LOW' },
  inferenceSupport: { id: 'support.inference', execution: 'MESH_DELEGATION', consumes: ['text/plain', 'chat.context'], produces: ['text/plain'], latencyClass: 'MEDIUM' },
};

export function soulCapability(id: string): SoulCapability | undefined {
  return Object.values(SOUL_CAPABILITIES).find(capability => capability.id === id);
}

export function composeCapabilities(primaryId: string, supportingIds: string[]): SoulCapability | undefined {
  const primary = soulCapability(primaryId);
  const supporting = supportingIds.map(soulCapability).filter(Boolean) as SoulCapability[];
  if (!primary || supporting.length === 0) return primary;
  return {
    id: `composed.${primary.id}`,
    execution: 'MESH_DELEGATION',
    consumes: Array.from(new Set([...(primary.consumes ?? []), ...supporting.flatMap(item => item.consumes ?? [])])),
    produces: Array.from(new Set([...(primary.produces ?? []), ...supporting.flatMap(item => item.produces ?? [])])),
    latencyClass: primary.latencyClass ?? 'MEDIUM',
  };
}
