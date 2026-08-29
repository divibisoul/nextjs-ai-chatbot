type PeerState={failures:number;openedUntil:number};
export class N05CircuitBreaker {
  private readonly states=new Map<string,PeerState>();
  constructor(private readonly threshold=5,private readonly cooldownMs=60000){}
  canRequest(peer='global'){const state=this.states.get(peer);return !state||Date.now()>=state.openedUntil}
  success(peer='global'){this.states.delete(peer)}
  failure(peer='global'){const state=this.states.get(peer)??{failures:0,openedUntil:0};state.failures+=1;if(state.failures>=this.threshold)state.openedUntil=Date.now()+this.cooldownMs;this.states.set(peer,state)}
  status(peer='global'){const state=this.states.get(peer);return {failures:state?.failures??0,open:!!state&&Date.now()<state.openedUntil,retryAt:state?.openedUntil??0}}
}
export async function withN05Timeout<T>(task:()=>Promise<T>,ms=30000):Promise<T>{const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),ms);try{return await Promise.race([task(),new Promise<T>((_,reject)=>setTimeout(()=>reject(new Error('SOUL_MESH_TIMEOUT')),ms))])}finally{clearTimeout(timeout);void controller}}
export function backoffDelay(attempt:number,base=250,max=8000){return Math.min(max,base*2**attempt)+Math.floor(Math.random()*100)}
export async function withN05Retry<T>(operation:()=>Promise<T>,peer='global',options:{retries?:number;breaker?:N05CircuitBreaker}={}){const breaker=options.breaker??n05CircuitBreaker;if(!breaker.canRequest(peer))throw new Error(`SOUL_MESH_CIRCUIT_OPEN:${peer}`);const retries=options.retries??2;let last:unknown;for(let attempt=0;attempt<=retries;attempt++){try{const value=await withN05Timeout(operation,30000);breaker.success(peer);return value}catch(error){last=error;breaker.failure(peer);if(attempt<retries)await new Promise(resolve=>setTimeout(resolve,backoffDelay(attempt)));}}throw last}
export const n05CircuitBreaker=new N05CircuitBreaker();
