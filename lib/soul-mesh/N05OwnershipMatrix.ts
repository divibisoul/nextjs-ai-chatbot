import type { SoulNucleus } from './SoulMeshProtocol';

export interface N05OwnershipRule {
  owner: SoulNucleus;
  consumers: readonly SoulNucleus[];
  fallback: readonly SoulNucleus[];
}

export const N05_OWNERSHIP_MATRIX: Record<string, N05OwnershipRule> = {
  'inference.*': { owner: 'N05', consumers: ['N01', 'N02', 'N03', 'N04', 'N06'], fallback: ['N02'] },
  'conversation.*': { owner: 'N05', consumers: ['N01', 'N02', 'N03', 'N04', 'N06'], fallback: ['N02'] },
  'document.*': { owner: 'N04', consumers: ['N01', 'N02', 'N03', 'N05', 'N06'], fallback: ['N06'] },
  'audio.*': { owner: 'N03', consumers: ['N01', 'N02', 'N04', 'N05', 'N06'], fallback: ['N01'] },
  'tool.*': { owner: 'N04', consumers: ['N01', 'N02', 'N03', 'N05', 'N06'], fallback: ['N06'] },
};

export function ownershipRule(capability: string): N05OwnershipRule | undefined {
  const exact = N05_OWNERSHIP_MATRIX[capability];
  if (exact) return exact;
  const prefix = `${capability.split('.')[0] ?? capability}.*`;
  return N05_OWNERSHIP_MATRIX[prefix];
}

export function canN05ConsumerInvoke(capability: string, source: SoulNucleus): boolean {
  return ownershipRule(capability)?.consumers.includes(source) ?? false;
}
