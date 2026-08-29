import { generateText } from 'ai';

export type InferenceWorkerInput = {
  model: Parameters<typeof generateText>[0]['model'];
  prompt: string;
  system?: string;
  temperature?: number;
  maxOutputTokens?: number;
};

export default async function inferenceWorker(input: InferenceWorkerInput) {
  const result = await generateText({ model: input.model, prompt: input.prompt, ...(input.system ? { system: input.system } : {}), ...(input.temperature === undefined ? {} : { temperature: input.temperature }), ...(input.maxOutputTokens === undefined ? {} : { maxOutputTokens: input.maxOutputTokens }) });
  return { text: result.text };
}
