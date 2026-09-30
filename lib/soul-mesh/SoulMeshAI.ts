import { generateText } from 'ai';
import { z } from 'zod';
import { myProvider } from '@/lib/ai/providers';
import { sendToNucleus } from '@/lib/soul-mesh/adapter';

const modelIds = ['chat-model', 'chat-model-reasoning', 'gemini-n02'] as const;

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

  if (request.model === 'gemini-n02') {
    const remote = await sendToNucleus('N02', 'ai.generate', {
      text: request.prompt,
      systemInstruction: request.system,
      temperature: request.temperature,
      maxOutputTokens: request.maxOutputTokens,
    });

    if (!remote || typeof remote !== 'object' || typeof (remote as { text?: unknown }).text !== 'string') {
      throw new Error('N05_GEMINI_REMOTE_RESPONSE_INVALID');
    }

    return {
      text: (remote as { text: string }).text,
      model: request.model,
      finishReason: 'remote',
      usage: (remote as { usage?: unknown }).usage,
      metadata: {
        ...(request.metadata ?? {}),
        route: 'N02',
        capability: 'ai.generate',
      },
    };
  }

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
    streaming: model !== 'gemini-n02',
  }));
}
