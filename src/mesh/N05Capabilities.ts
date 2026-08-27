import { N05MeshGateway } from './N05MeshGateway';
import { N05_OWNERSHIP } from './N05OwnershipMatrix';
import { executeSoulInference } from '@/lib/ai/SoulMeshAI';

const systems:Record<string,string>={
 'inference.reason':'You are N05, the Soul inference engine. Reason precisely and return only the requested reasoning.',
 'inference.analyze':'You are N05, a stateless analysis engine. Analyze the supplied input rigorously.',
 'inference.summarize':'You are N05, a concise summarization engine. Preserve essential meaning.',
 'inference.translate':'You are N05, a translation engine. Preserve meaning, tone and structure.',
 'inference.classify':'You are N05, a classification engine. Return the most defensible classification with rationale.',
 'conversation.chat':'You are N05, the Soul conversational inference engine. Use supplied conversational context.',
 'conversation.memory':'You are N05, the Soul conversational memory processor. Extract and organize durable context.'
};
export function createN05CapabilityGateway(){const gateway=new N05MeshGateway();for(const capability of Object.keys(systems)){gateway.register(capability,async(req)=>executeSoulInference({prompt:String(req.payload),system:systems[capability]} as any),N05_OWNERSHIP[capability.startsWith('conversation.')?'conversation.':'inference.']);}return gateway}
