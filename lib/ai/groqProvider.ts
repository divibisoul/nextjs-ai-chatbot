import Groq from 'groq-sdk';
import { generateText } from 'ai';
import { xai } from '@ai-sdk/xai';

export type GroqMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type FastInferenceOptions = {
  messages: readonly GroqMessage[];
  model?: string;
  temperature?: number;
  maxCompletionTokens?: number;
};

export type FastInferenceResult = {
  text: string;
  provider: 'groq' | 'xai';
  model: string;
};

const DEFAULT_GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
const DEFAULT_XAI_MODEL = process.env.XAI_FALLBACK_MODEL || 'grok-3-mini-beta';

function groqIsUnavailable(error: unknown): boolean {
  const status = typeof error === 'object' && error !== null && 'status' in error
    ? Number((error as { status?: unknown }).status)
    : 0;
  return status === 429 || status === 498 || status >= 500;
}

async function fallbackToXai(options: FastInferenceOptions): Promise<FastInferenceResult> {
  const result = await generateText({
    model: xai(DEFAULT_XAI_MODEL),
    messages: [...options.messages],
    temperature: options.temperature,
    maxOutputTokens: options.maxCompletionTokens,
  });
  const text = result.text?.trim();
  if (!text) throw new Error('XAI_FALLBACK_EMPTY_RESPONSE');
  return { text, provider: 'xai', model: DEFAULT_XAI_MODEL };
}

/** Server-side only. Groq is attempted first; quota/capacity/provider failures fall back to N05's xAI provider. */
export async function generateFastInference(options: FastInferenceOptions): Promise<FastInferenceResult> {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) return fallbackToXai(options);

  const groq = new Groq({ apiKey });
  const model = options.model?.trim() || DEFAULT_GROQ_MODEL;
  try {
    const response = await groq.chat.completions.create({
      model,
      messages: [...options.messages],
      temperature: options.temperature,
      max_completion_tokens: options.maxCompletionTokens,
    });
    const text = response.choices[0]?.message?.content?.trim();
    if (!text) throw new Error('GROQ_EMPTY_RESPONSE');
    return { text, provider: 'groq', model };
  } catch (error) {
    if (groqIsUnavailable(error)) return fallbackToXai(options);
    throw error;
  }
}
