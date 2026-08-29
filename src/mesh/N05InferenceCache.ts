import { createHash } from 'node:crypto';
import type { SoulInferenceRequest } from '@/lib/soul-mesh/SoulMeshAI';

type Entry = { expires: number; model: string; value: unknown };

export class N05InferenceCache {
  private readonly store = new Map<string, Entry>();
  private readonly ttlMs: number;

  constructor(ttlMs = Number(process.env.N05_INFERENCE_CACHE_TTL_MS ?? 300_000)) {
    this.ttlMs = Number.isFinite(ttlMs) && ttlMs > 0 ? ttlMs : 300_000;
  }

  key(input: Pick<SoulInferenceRequest, 'prompt' | 'system' | 'temperature' | 'model' | 'maxOutputTokens'>) {
    return createHash('sha256').update(JSON.stringify({
      prompt: input.prompt,
      system: input.system ?? '',
      temperature: input.temperature ?? null,
      model: input.model,
      maxOutputTokens: input.maxOutputTokens ?? null,
    })).digest('hex');
  }

  get(input: Pick<SoulInferenceRequest, 'prompt' | 'system' | 'temperature' | 'model' | 'maxOutputTokens'>) {
    const key = this.key(input);
    const entry = this.store.get(key);
    if (!entry || entry.expires <= Date.now() || entry.model !== input.model) {
      if (entry) this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(input: Pick<SoulInferenceRequest, 'prompt' | 'system' | 'temperature' | 'model' | 'maxOutputTokens'>, value: unknown) {
    this.store.set(this.key(input), { expires: Date.now() + this.ttlMs, model: input.model, value });
  }

  invalidateModel(model: string) {
    for (const [key, entry] of this.store) if (entry.model === model) this.store.delete(key);
  }

  clear() { this.store.clear(); }
  size() { return this.store.size; }
}
