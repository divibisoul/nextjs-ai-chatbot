import { generateText } from 'ai';
import { z } from 'zod';
import { myProvider } from '@/lib/ai/providers';

const modelIds = ['chat-model', 'chat-model-reasoning'] as const;

export const soulInferenceRequestSchema = z.object({
  prompt: z.string().min(1).max(100_000),
  system: z.string().max(30_000).optional(),
  model: z.enum(modelIds).default('chat-model'),
  temperature: z.number().min(0).max(2).optional(),
  maxOutputTokens: z.number().int().min(1).max(16_384).optional(),
  metadata: z.record(z.string()).optional(),
});

export type SoulInferenceRequest = z.infer<typeof soulInferenceRequestSchema>;

export async function executeSoulInference(input: unknown) {
  const request = soulInferenceRequestSchema.parse(input);
  const result = await generateText({
    model: myProvider.languageModel(request.model),
    system: request.system,
    prompt: request.prompt,
    temperature: request.temperature,
    maxOutputTokens: request.maxOutputTokens,
  });

  return {
    text: result.text,
    model: request.model,
    finishReason: result.finishReason,
    usage: result.usage,
    metadata: request.metadata ?? {},
  };
}

export function soulInferenceCapabilities() {
  return modelIds.map((model) => ({
    model,
    modality: 'text',
    streaming: true,
  }));
}
