export type N05TransportName='http'|'realtime'|'internal';
export type N05TransportStats={attempts:number;successes:number;failures:number;latencyMs:number|null;healthScore:number};
export type N05TransportHandler=(peer:string,request:unknown,signal:AbortSignal)=>Promise<unknown>;

const initialStats=():N05TransportStats=>({attempts:0,successes:0,failures:0,latencyMs:null,healthScore:1});

export class N05AdaptiveTransportRouter{
 private readonly handlers=new Map<N05TransportName,N05TransportHandler>();
 private readonly stats=new Map<N05TransportName,N05TransportStats>();

 register(name:N05TransportName,handler:N05TransportHandler){this.handlers.set(name,handler);if(!this.stats.has(name))this.stats.set(name,initialStats());return this;}

 available(){return [...this.handlers.keys()];}

 choose(preferred?:N05TransportName){
  const candidates=preferred&&this.handlers.has(preferred)?[preferred]:this.available();
  if(!candidates.length)throw new Error('N05_NO_TRANSPORT_AVAILABLE');
  return candidates.slice().sort((a,b)=>this.score(b)-this.score(a))[0];
 }

 async send(peer:string,request:unknown,signal:AbortSignal,preferred?:N05TransportName){
  const ordered=this.available().slice().sort((a,b)=>this.score(b)-this.score(a));
  if(preferred&&this.handlers.has(preferred))ordered.unshift(preferred);
  const unique=[...new Set(ordered)];
  let last:unknown;
  for(const name of unique){
   const handler=this.handlers.get(name)!;
   const state=this.stats.get(name)!;state.attempts++;
   const started=Date.now();
   try{const result=await handler(peer,request,signal);const latency=Date.now()-started;state.successes++;state.latencyMs=state.latencyMs===null?latency:(state.latencyMs*0.8)+(latency*0.2);state.healthScore=Math.min(1,(state.healthScore*0.8)+0.2);return{name,result,latencyMs:latency};}
   catch(error){last=error;state.failures++;state.healthScore=Math.max(0,state.healthScore*0.8);}
  }
  throw last instanceof Error?last:new Error('N05_ALL_TRANSPORTS_FAILED');
 }

 private score(name:N05TransportName){const state=this.stats.get(name)!;const latencyScore=state.latencyMs===null?0.5:1/(1+state.latencyMs/1000);const reliability=state.attempts?state.successes/state.attempts:1;return state.healthScore*0.5+reliability*0.35+latencyScore*0.15;}
 snapshot(){return Object.fromEntries([...this.stats.entries()].map(([name,state])=>[name,{...state,score:this.score(name)}]));}
}
