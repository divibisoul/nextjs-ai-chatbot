import { randomUUID } from 'node:crypto';
import { N05N06AgentSynergy } from './N05N06AgentSynergy';

export type PairStageInput = {
  task: string;
  input: unknown;
  requireValidation?: boolean;
  correlationId?: string;
  traceId?: string;
};

export type PairStageResult = {
  stage: 'N05-N06';
  source: 'N05';
  target: 'N06';
  correlationId: string;
  traceId: string;
  completed: boolean;
  stages: Array<{ agent: string; role: string; capability: string; output: unknown }>;
};

/**
 * Ordered pair-composition boundary for the Soul Mesh.
 * N05 supplies inference/context and N06 supplies planning/validation.
 * The same correlation and trace identifiers are retained across both IAs.
 */
export class N05N06PairStage {
  constructor(private readonly synergy = new N05N06AgentSynergy()) {}

  async execute(input: PairStageInput): Promise<PairStageResult> {
    const correlationId = input.correlationId ?? randomUUID();
    const traceId = input.traceId ?? randomUUID();
    const result = await this.synergy.reasonThenPlan({
      task: input.task,
      input: input.input,
      requireValidation: input.requireValidation ?? true,
      correlationId,
      traceId,
    });
    return {
      stage: 'N05-N06',
      source: 'N05',
      target: 'N06',
      correlationId,
      traceId,
      completed: result.stages.length >= (input.requireValidation === false ? 2 : 3),
      stages: result.stages,
    };
  }
}

export function createN05N06PairStage() { return new N05N06PairStage(); }
