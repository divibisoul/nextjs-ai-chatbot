import type { SaraFederatedContext } from './SARAClient';

declare module './SARAClient' {
  export function saraCycle(
    input: string,
    cycleId?: string,
    context?: SaraFederatedContext,
  ): Promise<{
    cycle_id: string;
    final_state: string;
    converged: boolean;
    rollback_performed: boolean;
    execution_report: Record<string, unknown>;
    trace_hash: string;
    probabilistic?: Record<string, unknown>;
  }>;
}
