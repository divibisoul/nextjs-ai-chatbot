import type { N05CapabilityHandler, Nucleus05Runtime } from './Nucleus05Runtime';

/** Explicit boundary between local N05 execution and remote Mesh delegation. */
export class N05LocalCapabilityBoundary {
  constructor(private readonly runtime: Nucleus05Runtime) {}

  register(capability: string, handler: N05CapabilityHandler): this {
    this.runtime.register(capability, handler);
    return this;
  }

  canExecuteLocally(capability: string): boolean {
    return this.runtime.has(capability);
  }

  async executeLocally(capability: string, payload: unknown): Promise<unknown> {
    if (!this.canExecuteLocally(capability)) {
      throw new Error(`N05_LOCAL_CAPABILITY_NOT_AVAILABLE:${capability}`);
    }
    return this.runtime.execute(capability, payload);
  }

  describe() {
    return this.runtime.describe();
  }
}
