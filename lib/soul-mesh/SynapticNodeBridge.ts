export interface LocalState {
  nucleusId: string;
  timestamp: number;
  activeAgents?: string[];
  memorySize?: number;
  lastInference?: unknown;
  toolUsage?: Record<string, number>;
}

export interface SynapticBridgeOptions {
  authorizationToken?: string;
  timeoutMs?: number;
}

/** Local neural-state adapter using the existing Soul Mesh endpoint. */
export class SynapticNodeBridge {
  private readonly nucleusId: string;
  private readonly meshUrl: string;
  private readonly authorizationToken?: string;
  private readonly timeoutMs: number;

  constructor(nucleusId: string, meshUrl: string, options: SynapticBridgeOptions = {}) {
    if (!/^N[1-7]$/.test(nucleusId) && !/^N0[1-7]$/.test(nucleusId)) throw new Error(`Invalid SOUL nucleus id: ${nucleusId}`);
    if (!meshUrl.trim()) throw new Error('Soul Mesh endpoint is required');
    this.nucleusId = nucleusId;
    this.meshUrl = meshUrl.replace(/\/$/, '');
    this.authorizationToken = options.authorizationToken?.trim() || undefined;
    this.timeoutMs = Math.max(1000, options.timeoutMs ?? 10000);
  }

  async sendState(state: LocalState): Promise<boolean> {
    const correlationId = this.createCorrelationId();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    const envelope = {
      protocol: 'soul-mesh/1' as const,
      contractVersion: '1.1.0' as const,
      id: this.createCorrelationId(),
      correlationId,
      source: this.normalizeNucleus(this.nucleusId),
      target: 'N07' as const,
      kind: 'request' as const,
      capability: 'neural.heartbeat',
      payload: { state },
      timestamp: Date.now(),
      meta: { runtime: 'synaptic-node-bridge', transport: 'HTTP', encoding: 'json', version: '1.1.0', traceId: correlationId },
    };
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Soul-Mesh-Correlation-Id': correlationId };
      if (this.authorizationToken) headers.Authorization = `Bearer ${this.authorizationToken}`;
      const response = await fetch(this.meshUrl, { method: 'POST', headers, body: JSON.stringify(envelope), signal: controller.signal, cache: 'no-store' });
      const body = (await response.json().catch(() => null)) as { correlationId?: string; source?: string; target?: string; protocol?: string; contractVersion?: string } | null;
      return response.ok && !!body && body.correlationId === correlationId && body.protocol === 'soul-mesh/1' && body.contractVersion === '1.1.0' && body.source === 'N07' && body.target === envelope.source;
    } catch (error) {
      console.error(`[${this.nucleusId}] Synaptic bridge error:`, error);
      return false;
    } finally {
      clearTimeout(timer);
    }
  }

  private normalizeNucleus(value: string): `N0${1 | 2 | 3 | 4 | 5 | 6 | 7}` {
    const normalized = value.startsWith('N0') ? value : value.replace(/^N([1-7])$/, 'N0$1');
    return normalized as `N0${1 | 2 | 3 | 4 | 5 | 6 | 7}`;
  }

  private createCorrelationId(): string {
    return globalThis.crypto?.randomUUID?.() ?? `syn-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}
