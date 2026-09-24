export type SaraFederatedContext = {
  session_id?: string;
  client?: string;
  research_snippets?: string[];
  user_feedback_refs?: string[];
  pipeline?: Record<string, unknown>;
  probabilistic?: Record<string, unknown>;
  scenarios?: Array<{ name: string; note: string }>;
} & Record<string, unknown>;

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

export async function saraCycle(input: string, cycleId?: string, context?: SaraFederatedContext): Promise<{
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
      body: JSON.stringify({
        input,
        cycle_id: correlationId,
        ...(context ? { context: { ...context, client: context.client ?? 'n05' } } : {}),
      }),
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
      probabilistic?: unknown;
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
      ...(result.probabilistic && typeof result.probabilistic === 'object'
        ? { probabilistic: result.probabilistic as Record<string, unknown> }
        : {}),
    };
  } finally {
    clearTimeout(timer);
  }
}


export async function saraTrace(cycleId: string): Promise<unknown> {
  if (!saraConfigured()) throw new Error('SARA_NOT_CONFIGURED');
  const id = cycleId.trim();
  if (!id) throw new Error('SARA_CYCLE_ID_REQUIRED');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(
      BASE_URL() + '/v1/trace/' + encodeURIComponent(id),
      {
        method: 'GET',
        headers: {
          authorization: 'Bearer ' + TOKEN(),
          accept: 'application/json',
          'X-Correlation-ID': id,
        },
        signal: controller.signal,
        cache: 'no-store',
      },
    );
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) throw new Error('SARA_TRACE_HTTP_' + response.status);
    return payload;
  } finally {
    clearTimeout(timer);
  }
}


type SaraAuxRequestOptions = {
  method?: 'GET' | 'POST';
  body?: unknown;
  correlationId?: string;
  auth?: boolean;
};

async function saraAuxRequest(path: string, options: SaraAuxRequestOptions = {}): Promise<Record<string, unknown>> {
  const baseUrl = BASE_URL();
  const token = TOKEN();
  const requiresAuth = options.auth !== false;
  if (!baseUrl || (requiresAuth && !token)) throw new Error('SARA_NOT_CONFIGURED');
  const correlationId = options.correlationId?.trim() || crypto.randomUUID();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const headers: Record<string, string> = {
      accept: 'application/json',
      'X-Correlation-ID': correlationId,
    };
    if (requiresAuth) headers.authorization = 'Bearer ' + token;
    if (options.method === 'POST') headers['content-type'] = 'application/json';
    const response = await fetch(baseUrl + path, {
      method: options.method ?? 'GET',
      headers,
      ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
      signal: controller.signal,
      cache: 'no-store',
    });
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) throw new Error('SARA_HTTP_' + response.status);
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('SARA_INVALID_RESPONSE');
    const echoed = response.headers.get('X-Correlation-ID');
    if (echoed && echoed !== correlationId) throw new Error('SARA_CORRELATION_ID_MISMATCH');
    return payload as Record<string, unknown>;
  } finally {
    clearTimeout(timer);
  }
}

export async function saraHealth(): Promise<Record<string, unknown>> {
  return saraAuxRequest('/health', { auth: false });
}

export async function saraCapabilities(): Promise<Record<string, unknown>> {
  return saraAuxRequest('/v1/capabilities');
}

export async function saraState(): Promise<Record<string, unknown>> {
  return saraAuxRequest('/v1/state');
}

export async function saraAudit(
  input: string,
  correlationId?: string,
  context?: SaraFederatedContext,
): Promise<Record<string, unknown>> {
  if (!input.trim()) throw new Error('SARA_INPUT_REQUIRED');
  return saraAuxRequest('/v1/audit', {
    method: 'POST',
    body: { input, ...(context ? { context: { ...context, client: context.client ?? 'n05' } } : {}) },
    correlationId,
  });
}

export async function saraRegenerate(
  input: string,
  correlationId?: string,
  context?: SaraFederatedContext,
): Promise<Record<string, unknown>> {
  if (!input.trim()) throw new Error('SARA_INPUT_REQUIRED');
  return saraAuxRequest('/v1/regenerate', {
    method: 'POST',
    body: { input, ...(context ? { context: { ...context, client: context.client ?? 'n05' } } : {}) },
    correlationId,
  });
}