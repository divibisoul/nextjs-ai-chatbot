import { executeSoulInference, type SoulInferenceRequest } from '@/lib/soul-mesh/SoulMeshAI';

type Job<T> = { priority:number; sequence:number; run:()=>Promise<T>; resolve:(value:T)=>void; reject:(reason:unknown)=>void };

export class N05InferencePool {
  private readonly concurrency: number;
  private active = 0;
  private sequence = 0;
  private readonly queue: Job<unknown>[] = [];

  constructor(concurrency = Math.max(1, Number(process.env.N05_MAX_CONCURRENCY ?? 4))) {
    this.concurrency = Number.isFinite(concurrency) && concurrency > 0 ? Math.floor(concurrency) : 4;
  }

  run(input:SoulInferenceRequest, priority=50) {
    return new Promise<unknown>((resolve,reject)=>{
      this.queue.push({priority,sequence:this.sequence++,run:()=>executeSoulInference(input),resolve,reject});
      this.queue.sort((a,b)=>b.priority-a.priority || a.sequence-b.sequence);
      this.drain();
    });
  }

  private drain() {
    while(this.active<this.concurrency && this.queue.length){
      const job=this.queue.shift()!;
      this.active++;
      job.run().then(job.resolve,job.reject).finally(()=>{this.active--;this.drain();});
    }
  }

  stats(){return {active:this.active,queued:this.queue.length,concurrency:this.concurrency};}
}

export const n05InferencePool = new N05InferencePool();
