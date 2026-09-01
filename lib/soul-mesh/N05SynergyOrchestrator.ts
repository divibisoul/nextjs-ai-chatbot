import { randomUUID } from 'crypto';
import { describePeer, sendTo, type N05Peer } from './peer-client';

export type N05SynergyStep = { nucleus: N05Peer; capability: string; payload: unknown };
export type N05SynergyResult = { correlationId: string; steps: Array<{ nucleus: N05Peer; capability: string; result: unknown }> };

type PeerDescription = {
  executableCapabilities?: string[];
  capabilities?: Array<string | { id?: string; name?: string }>;
  declaredCapabilities?: string[];
};

/** Resolve a capability from the peer's real discovery snapshot before execution. */
export async function resolvePeerCapability(
  nucleus: N05Peer,
  preferred: readonly string[],
  timeoutMs = 10_000,
): Promise<string> {
  const response = await describePeer(nucleus, timeoutMs);
  const payload = (response.payload ?? {}) as PeerDescription;
  const advertised = new Set<string>([
    ...(payload.executableCapabilities ?? []),
    ...(payload.declaredCapabilities ?? []),
    ...(payload.capabilities ?? []).flatMap(item => typeof item === 'string' ? [item] : [item.id ?? item.name].filter(Boolean) as string[]),
  ]);

  const resolved = preferred.find(capability => advertised.has(capability));
  if (!resolved) throw new Error(`N05_NO_COMPATIBLE_CAPABILITY:${nucleus}:${preferred.join('|')}`);
  return resolved;
}

/** Composes N05 cognitive agents with specialized peer IAs through the existing Soul Mesh. */
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

export async function composeN05WithN06(prompt: string) {
  const [n06Capability, n02Capability, n04Capability] = await Promise.all([
    resolvePeerCapability('N06', ['support.ai-pilot', 'support.context', 'support.mesh']),
    resolvePeerCapability('N02', ['ai.generate', 'cognitive-processing', 'ai.multimodal']),
    resolvePeerCapability('N04', ['tool.run', 'tool-execution', 'document.create']),
  ]);

  return executeN05Synergy([
    { nucleus: 'N06', capability: n06Capability, payload: { task: prompt, prompt } },
    { nucleus: 'N02', capability: n02Capability, payload: { prompt: 'Reason over the previous plan and identify the best solution.', context: 'N06_RESULT' } },
    { nucleus: 'N04', capability: n04Capability, payload: { instruction: 'Execute the useful tool work from the reasoning result.' } },
  ]);
}

export async function composeN05WithN04(prompt: string) {
  const [n02Capability, n04Capability, n06Capability] = await Promise.all([
    resolvePeerCapability('N02', ['ai.generate', 'cognitive-processing']),
    resolvePeerCapability('N04', ['document.create', 'tool.run', 'tool-execution']),
    resolvePeerCapability('N06', ['support.ai-pilot', 'support.context']),
  ]);

  return executeN05Synergy([
    { nucleus: 'N02', capability: n02Capability, payload: { prompt } },
    { nucleus: 'N04', capability: n04Capability, payload: { instruction: 'Turn the reasoning into a useful artifact.' } },
    { nucleus: 'N06', capability: n06Capability, payload: { task: 'Review and plan the next action for the artifact.' } },
  ]);
}
