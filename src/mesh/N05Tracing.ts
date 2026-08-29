export type N05Trace={traceId:string;correlationId:string;source:string;target:string;capability:string;startedAt:number;latencyMs?:number;status?:'ok'|'error';error?:string};
function id(){return globalThis.crypto?.randomUUID?.()??`${Date.now()}-${Math.random().toString(16).slice(2)}`}
export function startN05Trace(input:Omit<N05Trace,'traceId'|'startedAt'>):N05Trace{return{...input,traceId:id(),startedAt:Date.now()}}
export function finishN05Trace(trace:N05Trace,status:'ok'|'error',error?:unknown){return{...trace,status,error:error?error instanceof Error?error.message:String(error):undefined,latencyMs:Date.now()-trace.startedAt}}
export function traceHeaders(trace:N05Trace){return{'x-soul-trace-id':trace.traceId,'x-soul-correlation-id':trace.correlationId,'x-soul-source':trace.source,'x-soul-target':trace.target,'x-soul-capability':trace.capability}}
