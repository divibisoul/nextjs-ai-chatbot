import type { SoulMeshMessage, SoulMeshTransport } from './SoulMeshProtocol';

/** Adaptive transport selection with latency/reliability scoring and fallback. */
export class AdaptiveTransportRouter implements SoulMeshTransport {
  private readonly stats: { ok:number; fail:number; latency:number }[];
  private readonly openedUntil:number[];
  constructor(private readonly transports:SoulMeshTransport[], private readonly cooldownMs=60000){
    this.stats=transports.map(()=>({ok:0,fail:0,latency:1000}));
    this.openedUntil=transports.map(()=>0);
  }
  private score(i:number){const s=this.stats[i];return (s.latency+1)*(1+s.fail)/(1+s.ok)}
  private order(){return this.transports.map((_,i)=>i).filter(i=>Date.now()>=this.openedUntil[i]).sort((a,b)=>this.score(a)-this.score(b))}
  async send(message:SoulMeshMessage):Promise<void>{
    if(!this.transports.length) throw new Error('SOUL_MESH_NO_TRANSPORTS');
    const failures:unknown[]=[];
    for(const i of this.order()){
      const started=Date.now();
      try{await Promise.race([this.transports[i].send(message),new Promise<never>((_,reject)=>setTimeout(()=>reject(new Error('SOUL_MESH_TRANSPORT_TIMEOUT')),30000))]);const latency=Date.now()-started;const s=this.stats[i];s.latency=(s.latency*0.8)+(latency*0.2);s.ok++;return}
      catch(error){this.stats[i].fail++;this.openedUntil[i]=this.stats[i].fail>=5?Date.now()+this.cooldownMs:0;failures.push(error);await new Promise(r=>setTimeout(r,Math.min(8000,250*2**Math.min(this.stats[i].fail-1,5))))}
    }
    const detail=failures.map(e=>e instanceof Error?e.message:String(e)).join(';');throw new Error(`SOUL_MESH_ALL_TRANSPORTS_FAILED${detail?`:${detail}`:''}`)
  }
  onMessage(handler:(message:SoulMeshMessage)=>void|Promise<void>):()=>void{const unsubscribe=this.transports.map(t=>t.onMessage(handler));return()=>unsubscribe.forEach(remove=>remove())}
  health(){return this.stats.map((s,i)=>({index:i,ok:s.ok,fail:s.fail,latencyMs:Math.round(s.latency),circuitOpen:Date.now()<this.openedUntil[i]}))}
}

/** Backward-compatible name retained for existing callers. */
export class SoulMeshTransportMultiplexer extends AdaptiveTransportRouter {}
