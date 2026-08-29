import { randomUUID } from 'node:crypto';
import { withN05Retry, n05CircuitBreaker } from './N05Resilience';
import { sendToNucleus } from '../../lib/soul-mesh/adapter';

/** N05+N04 cooperative pair: N05 supplies inference/conversation; N04 supplies document/tool/artifact execution. */
export async function delegateN05WorkToN04(capability:string,payload:unknown,correlationId=randomUUID()):Promise<unknown>{
  if(!/^(document|tool|artifact)\./.test(capability)) throw new Error(`N05_N04_CAPABILITY_NOT_COMPLEMENTARY:${capability}`);
  return withN05Retry(
    () => sendToNucleus('N04',capability,payload,30000,correlationId),
    'N04',
    {retries:2,breaker:n05CircuitBreaker}
  );
}

export async function composeN05InferenceWithN04Tool(inferencePayload:unknown,toolCapability:string,toolPayload:unknown){
  const toolResult=await delegateN05WorkToN04(toolCapability,toolPayload);
  return {source:'N05',partner:'N04',capability:toolCapability,inferencePayload,toolResult,correlationId:randomUUID()};
}
