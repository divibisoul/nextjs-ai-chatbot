const BASE_URL = () => (process.env.SARA_BASE_URL ?? '').trim().replace(/\/$/, '');
const TOKEN = () => (process.env.SARA_API_TOKEN ?? '').trim();

export function saraConfigured(): boolean {
  return Boolean(BASE_URL() && TOKEN());
}

export function saraChatEnabled(): boolean {
  return (process.env.SARA_ENABLE_CHAT ?? '').trim().toLowerCase() === 'true';
}

export function extractMessageText(message: unknown): string {
  if (!message || typeof message !== 'object') return '';
  const candidate = message as { parts?: unknown };
  if (!Array.isArray(candidate.parts)) return '';
  return candidate.parts
    .filter((part): part is { type?: unknown; text?: unknown } => Boolean(part) && typeof part === 'object')
    .filter(part => part.type === 'text' && typeof part.text === 'string')
    .map(part => part.text as string)
    .join('\n')
    .trim();
}

export async function saraCycle(input: string, cycleId?: string): Promise<{
  cycle_id: string;
  final_state: string;
  converged: boolean;
  rollback_performed: boolean;
  execution_report: Record<string, unknown>;
  trace_hash: string;
}> {
  if (!saraConfigured()) throw new Error('SARA_NOT_CONFIGURED');
  if (!input.trim()) throw new Error('SARA_INPUT_REQUIRED');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const correlationId = cycleId?.trim() || crypto.randomUUID();
    const response = await fetch(BASE_URL() + '/v1/cycle', {
      method: 'POST',
      headers: {
        authorization: 'Bearer ' + TOKEN(),
        'content-type': 'application/json',
        accept: 'application/json',
        'X-Correlation-ID': correlationId,
      },
      body: JSON.stringify({ input, cycle_id: correlationId }),
      signal: controller.signal,
      cache: 'no-store',
    });

    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const body = payload && typeof payload === 'object' ? payload as { error?: unknown } : {};
      throw new Error('SARA_HTTP_' + response.status + ':' + String(body.error ?? 'request failed'));
    }
    if (!payload || typeof payload !== 'object') throw new Error('SARA_INVALID_CYCLE_RESPONSE');

    const result = payload as Partial<{
      cycle_id: unknown;
      final_state: unknown;
      converged: unknown;
      rollback_performed: unknown;
      execution_report: unknown;
      trace_hash: unknown;
    }>;
    if (
      typeof result.cycle_id !== 'string' ||
      typeof result.final_state !== 'string' ||
      typeof result.converged !== 'boolean' ||
      typeof result.rollback_performed !== 'boolean' ||
      !result.execution_report ||
      typeof result.execution_report !== 'object' ||
      typeof result.trace_hash !== 'string'
    ) {
      throw new Error('SARA_INVALID_CYCLE_RESPONSE');
    }
    return {
      cycle_id: result.cycle_id,
      final_state: result.final_state,
      converged: result.converged,
      rollback_performed: result.rollback_performed,
      execution_report: result.execution_report as Record<string, unknown>,
      trace_hash: result.trace_hash,
    };
  } finally {
    clearTimeout(timer);
  }
}
