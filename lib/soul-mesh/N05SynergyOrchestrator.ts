import { randomUUID } from 'crypto';
import { sendTo, type N05Peer } from './peer-client';

export type N05SynergyStep = { nucleus: N05Peer; capability: string; payload: unknown };
export type N05SynergyResult = { correlationId: string; steps: Array<{ nucleus: N05Peer; capability: string; result: unknown }> };

/** Composes N05's cognitive agents with specialized agents in the rest of Soul Mesh. */
export async function executeN05Synergy(steps: N05SynergyStep[], correlationId = randomUUID()): Promise<N05SynergyResult> {
  const results: N05SynergyResult['steps'] = [];
  let previous: unknown;
  for (const step of steps) {
    const payload = previous === undefined ? step.payload : { input: step.payload, previous, correlationId };
    const response = await sendTo(step.nucleus, step.capability, payload);
    results.push({ nucleus: step.nucleus, capability: step.capability, result: response.payload });
    previous = response.payload;
  }
  return { correlationId, steps: results };
}

export function composeN05WithN06(prompt: string) {
  return executeN05Synergy([
    { nucleus: 'N06', capability: 'pilot.plan', payload: { task: prompt } },
    { nucleus: 'N02', capability: 'inference.reason', payload: { prompt: 'Reason over the plan and identify the best solution.' } },
    { nucleus: 'N04', capability: 'tool.execute', payload: { instruction: 'Execute the useful tool work from the reasoning result.' } },
  ]);
}

export function composeN05WithN04(prompt: string) {
  return executeN05Synergy([
    { nucleus: 'N02', capability: 'inference.reason', payload: { prompt } },
    { nucleus: 'N04', capability: 'document.create', payload: { instruction: 'Turn the reasoning into a useful artifact.' } },
    { nucleus: 'N06', capability: 'pilot.plan', payload: { task: 'Review and plan the next action for the artifact.' } },
  ]);
}
