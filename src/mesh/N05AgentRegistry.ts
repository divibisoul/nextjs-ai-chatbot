import type { MeshRequest } from './N05MeshGateway';
import type { N05Agent } from './N05AgentContract';

export class N05AgentRegistry {
  private readonly agents = new Map<string, N05Agent>();
  register(agent: N05Agent) { this.agents.set(agent.id, agent); }
  find(capability: string) { return [...this.agents.values()].find((agent) => agent.capabilities.includes(capability)); }
  async execute(request: MeshRequest) {
    const agent = this.find(request.capability);
    if (!agent) throw new Error(`AGENT_NOT_FOUND:${request.capability}`);
    return agent.execute(request);
  }
  describe() { return [...this.agents.values()].map(({ id, name, capabilities }) => ({ id, name, capabilities })); }
}
