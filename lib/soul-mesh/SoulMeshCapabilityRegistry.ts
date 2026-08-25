import { SOUL_MESH_CAPABILITIES, type SoulMeshCapability } from './SoulMeshCapabilities';
export class SoulMeshCapabilityRegistry {
  private readonly capabilities = [...SOUL_MESH_CAPABILITIES];
  register(capabilities: SoulMeshCapability[]): void { this.capabilities.push(...capabilities); }
  getAll(): SoulMeshCapability[] { return [...this.capabilities]; }
  has(id: string): boolean { return this.capabilities.some((capability) => capability.id === id); }
}
