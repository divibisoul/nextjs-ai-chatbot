import os from 'node:os';
import { Piscina } from 'piscina';
import { executeSoulInference, type SoulInferenceRequest } from '@/lib/soul-mesh/SoulMeshAI';

export type N05InferenceResult = Awaited<ReturnType<typeof executeSoulInference>>;
type Job = {
  priority:number;
  sequence:number;
  input:SoulInferenceRequest;
  resolve:(value:N05InferenceResult)=>void;
  reject:(reason:unknown)=>void;
};

export class N05InferencePool {
  private readonly concurrency:number;
  private readonly queue:Job[]=[];
  private active=0;
  private sequence=0;
  private readonly piscina?:Piscina;

  constructor(concurrency=Math.max(1,os.cpus().length)){
    const configured=Number(process.env.N05_MAX_CONCURRENCY ?? concurrency);
    this.concurrency=Number.isFinite(configured)&&configured>0?Math.floor(configured):Math.max(1,os.cpus().length);
    const workerUrl=process.env.N05_PISCINA_WORKER_URL?.trim();
    if(workerUrl){
      this.piscina=new Piscina({filename:workerUrl,minThreads:1,maxThreads:this.concurrency,maxQueue:Math.max(1,this.concurrency*this.concurrency),idleTimeout:1000,recordTiming:true});
    }
  }

  run(input:SoulInferenceRequest,priority=50):Promise<N05InferenceResult>{
    return new Promise((resolve,reject)=>{
      this.queue.push({priority,sequence:this.sequence++,input,resolve,reject});
      this.queue.sort((a,b)=>b.priority-a.priority||a.sequence-b.sequence);
      this.drain();
    });
  }

  private drain(){
    while(this.active<this.concurrency&&this.queue.length){
      const job=this.queue.shift()!;
      this.active++;
      const execution:Promise<N05InferenceResult>=this.piscina
        ? this.piscina.run(job.input) as Promise<N05InferenceResult>
        : executeSoulInference(job.input);
      execution.then(job.resolve,job.reject).finally(()=>{this.active--;this.drain();});
    }
  }

  stats(){
    const histogram=this.piscina?.histogram;
    return {
      active:this.active,
      queued:this.queue.length,
      concurrency:this.concurrency,
      piscinaEnabled:Boolean(this.piscina),
      piscinaRunTime:histogram?.runTime,
      piscinaWaitTime:histogram?.waitTime,
    };
  }

  async close(){await this.piscina?.destroy();}
}

export const n05InferencePool=new N05InferencePool();
