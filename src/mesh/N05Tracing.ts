export type N05Trace={traceId:string;correlationId:string;source:string;target:string;capability:string;startedAt:number;latencyMs?:number;status?:string;error?:string};
export function startN05Trace(input:Omit<N05Trace,'startedAt'>):N05Trace{return {...input,startedAt:Date.now()}}
export function finishN05Trace(trace:N05Trace,status:string,error?:unknown){return {...trace,status,error:error?String(error):undefined,latencyMs:Date.now()-trace.startedAt}}
