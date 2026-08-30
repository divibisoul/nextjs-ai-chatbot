import { generateText } from 'ai';
import { myProvider } from '@/lib/ai/providers';

export type InferenceWorkerInput = {
  model: 'chat-model' | 'chat-model-reasoning';
  prompt: string;
  system?: string;
  temperature?: number;
  maxOutputTokens?: number;
  metadata?: Record<string, string>;
};

export default async function inferenceWorker(input: InferenceWorkerInput) {
  const result = await generateText({
    model: myProvider.languageModel(input.model),
    prompt: input.prompt,
    ...(input.system ? { system: input.system } : {}),
    ...(input.temperature === undefined ? {} : { temperature: input.temperature }),
    ...(input.maxOutputTokens === undefined ? {} : { maxOutputTokens: input.maxOutputTokens }),
  });

  return {
    text: result.text,
    model: input.model,
    finishReason: result.finishReason,
    usage: result.usage,
    metadata: input.metadata ?? {},
  };
}
