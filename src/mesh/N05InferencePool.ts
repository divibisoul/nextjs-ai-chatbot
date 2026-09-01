import os from 'node:os';
import { executeSoulInference, type SoulInferenceRequest } from '@/lib/soul-mesh/SoulMeshAI';

export type N05InferenceResult = Awaited<ReturnType<typeof executeSoulInference>>;
type Job = {
  priority: number;
  sequence: number;
  input: SoulInferenceRequest;
  resolve: (value: N05InferenceResult) => void;
  reject: (reason: unknown) => void;
};

/** Deterministic bounded inference pool. The runtime owns scheduling; no undeclared worker-pool dependency is required. */
export class N05InferencePool {
  private readonly concurrency: number;
  private readonly queue: Job[] = [];
  private active = 0;
  private sequence = 0;

  constructor(concurrency = Math.max(1, os.cpus().length)) {
    const configured = Number(process.env.N05_MAX_CONCURRENCY ?? concurrency);
    this.concurrency = Number.isFinite(configured) && configured > 0
      ? Math.floor(configured)
      : Math.max(1, os.cpus().length);
  }

  run(input: SoulInferenceRequest, priority = 50): Promise<N05InferenceResult> {
    return new Promise((resolve, reject) => {
      this.queue.push({ priority, sequence: this.sequence++, input, resolve, reject });
      this.queue.sort((a, b) => b.priority - a.priority || a.sequence - b.sequence);
      this.drain();
    });
  }

  private drain() {
    while (this.active < this.concurrency && this.queue.length) {
      const job = this.queue.shift();
      if (!job) break;
      this.active++;
      Promise.resolve()
        .then(() => executeSoulInference(job.input))
        .then(job.resolve, job.reject)
        .finally(() => {
          this.active--;
          this.drain();
        });
    }
  }

  stats() {
    return {
      active: this.active,
      queued: this.queue.length,
      concurrency: this.concurrency,
      piscinaEnabled: false,
    };
  }

  async close() {
    this.queue.splice(0).forEach(job => job.reject(new Error('N05_INFERENCE_POOL_CLOSED')));
  }
}

export const n05InferencePool = new N05InferencePool();
