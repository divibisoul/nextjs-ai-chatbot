import type { SoulInferenceRequest } from '@/lib/soul-mesh/SoulMeshAI';

export type N05RouteConstraints = {
  complexity?: number;
  latencyTargetMs?: number;
  costWeight?: number;
  qualityWeight?: number;
  requestedModel?: SoulInferenceRequest['model'];
};

export type N05ModelRoute = {
  model: SoulInferenceRequest['model'];
  score: number;
  reason: string;
  candidates: Array<{
    model: SoulInferenceRequest['model'];
    score: number;
    relativeCost: number;
    relativeLatency: number;
    quality: number;
  }>;
};

type ModelProfile = {
  model: SoulInferenceRequest['model'];
  relativeCost: number;
  relativeLatency: number;
  quality: number;
  reasoningCapacity: number;
};

const MODEL_PROFILES: readonly ModelProfile[] = [
  {
    model: 'chat-model',
    relativeCost: 1,
    relativeLatency: 1,
    quality: 0.65,
    reasoningCapacity: 0.55,
  },
  {
    model: 'chat-model-reasoning',
    relativeCost: 3,
    relativeLatency: 2,
    quality: 0.9,
    reasoningCapacity: 0.95,
  },
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * N05 model-selection policy. It chooses among models actually exposed by the
 * repository provider; it does not invent unavailable cloud/edge models.
 *
 * Costs and latency are relative policy indices, not billing measurements.
 * Observed provider telemetry can replace these indices without changing the
 * routing contract.
 */
export class N05ModelRouter {
  route(constraints: N05RouteConstraints = {}): N05ModelRoute {
    const complexity = clamp(constraints.complexity ?? 0.5, 0, 1);
    const latencyTargetMs = constraints.latencyTargetMs ?? 2500;
    const costWeight = clamp(constraints.costWeight ?? 0.35, 0, 1);
    const qualityWeight = clamp(constraints.qualityWeight ?? 0.65, 0, 1);
    const requested = constraints.requestedModel;

    const candidates = MODEL_PROFILES
      .filter(profile => !requested || profile.model === requested)
      .map(profile => {
        const reasoningFit = 1 - Math.abs(profile.reasoningCapacity - complexity);
        const latencyFit = latencyTargetMs >= 2500
          ? (profile.relativeLatency === 1 ? 1 : 0.65)
          : (profile.relativeLatency === 1 ? 1 : 0.35);
        const costFit = 1 / profile.relativeCost;

        const score =
          qualityWeight * (0.55 * profile.quality + 0.45 * reasoningFit) +
          costWeight * costFit +
          (1 - costWeight - qualityWeight >= 0 ? 1 - costWeight - qualityWeight : 0) * latencyFit;

        return {
          model: profile.model,
          score,
          relativeCost: profile.relativeCost,
          relativeLatency: profile.relativeLatency,
          quality: profile.quality,
        };
      });

    if (candidates.length === 0) {
      throw new Error('N05_REQUESTED_MODEL_UNAVAILABLE');
    }

    candidates.sort((a, b) => b.score - a.score || a.relativeCost - b.relativeCost);

    const selected = candidates[0];
    const reason = requested
      ? `explicit model request: ${requested}`
      : `multi-objective policy: complexity=${complexity.toFixed(2)}, latencyTargetMs=${latencyTargetMs}, costWeight=${costWeight.toFixed(2)}, qualityWeight=${qualityWeight.toFixed(2)}`;

    return {
      model: selected.model,
      score: Number(selected.score.toFixed(6)),
      reason,
      candidates,
    };
  }
}

export const n05ModelRouter = new N05ModelRouter();
