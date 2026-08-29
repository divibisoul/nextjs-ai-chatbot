import { randomUUID } from 'node:crypto';
import { Nucleus05Runtime } from '../../lib/soul-mesh/Nucleus05Runtime';

export type AgentRole = 'reasoner' | 'contextualizer' | 'validator' | 'planner';
export type AgentDescriptor = { id: string; nucleus: 'N05' | 'N06'; role: AgentRole; capabilities: string[]; consumers: Array<'N05' | 'N06'> };
export type SynergyRequest = { correlationId?: string; traceId?: string; task: string; input: unknown; requireValidation?: boolean };
export type SynergyResult = { source: 'N05'; target: 'N06'; correlationId: string; traceId: string; stages: Array<{ agent: string; role: AgentRole; capability: string; output: unknown }> };

export const N05_N06_AGENTS: readonly AgentDescriptor[] = [
  { id: 'N05.reasoner', nucleus: 'N05', role: 'reasoner', capabilities: ['ai.infer', 'inference.reason', 'inference.analyze'], consumers: ['N06'] },
  { id: 'N05.contextualizer', nucleus: 'N05', role: 'contextualizer', capabilities: ['conversation'], consumers: ['N06'] },
  { id: 'N06.planner', nucleus: 'N06', role: 'planner', capabilities: ['cognitive.plan'], consumers: ['N05'] },
  { id: 'N06.validator', nucleus: 'N06', role: 'validator', capabilities: ['cognitive.validate'], consumers: ['N05'] },
];

/**
 * Complementary-agent layer. N05 owns inference/contextual reasoning;
 * N06 contributes planning/validation. Existing Mesh/runtime implementations
 * remain authoritative; this class only composes them.
 */
export class N05N06AgentSynergy {
  constructor(
    private readonly runtime: Nucleus05Runtime = new Nucleus05Runtime().register('ai.infer', async (payload) => {
      const { executeSoulInference } = await import('../../lib/soul-mesh/SoulMeshAI');
      return executeSoulInference(payload);
    }),
    private readonly sendToN06: (capability: string, payload: unknown) => Promise<unknown> = async (capability, payload) => {
      const base = process.env.SOUL_MESH_N06_URL;
      if (!base) throw new Error('SOUL_MESH_N06_URL_REQUIRED');
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 30_000);
      try {
        const response = await fetch(`${base.replace(/\/$/, '')}/mesh/in`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`N06_HTTP_${response.status}`);
        return response.json();
      } finally { clearTimeout(timer); }
    },
  ) {}

  listAgents() { return N05_N06_AGENTS.map((agent) => ({ ...agent, capabilities: [...agent.capabilities], consumers: [...agent.consumers] })); }

  async reasonThenPlan(request: SynergyRequest): Promise<SynergyResult> {
    const correlationId = request.correlationId ?? randomUUID();
    const traceId = request.traceId ?? randomUUID();
    const reasoning = await this.runtime.execute('ai.infer', { prompt: request.task, input: request.input, mode: 'reason', correlationId, traceId });
    const planning = await this.sendToN06('cognitive.plan', { protocol: 'soul-mesh/1', source: 'N05', target: 'N06', id: randomUUID(), correlationId, traceId, capability: 'cognitive.plan', payload: { task: request.task, reasoning }, timestamp: Date.now() });
    const stages: SynergyResult['stages'] = [
      { agent: 'N05.reasoner', role: 'reasoner', capability: 'ai.infer', output: reasoning },
      { agent: 'N06.planner', role: 'planner', capability: 'cognitive.plan', output: planning },
    ];
    if (request.requireValidation) {
      const validation = await this.sendToN06('cognitive.validate', { protocol: 'soul-mesh/1', source: 'N05', target: 'N06', id: randomUUID(), correlationId, traceId, capability: 'cognitive.validate', payload: { task: request.task, plan: planning }, timestamp: Date.now() });
      stages.push({ agent: 'N06.validator', role: 'validator', capability: 'cognitive.validate', output: validation });
    }
    return { source: 'N05', target: 'N06', correlationId, traceId, stages };
  }
}

export function createN05N06AgentSynergy() { return new N05N06AgentSynergy(); }
