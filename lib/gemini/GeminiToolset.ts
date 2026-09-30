import 'server-only';

import { createHash } from 'node:crypto';
import { z } from 'zod';
import { N07NeuralBridge } from '@/lib/soul-neural/N07NeuralBridge';

const INTERACTIONS_URL = 'https://generativelanguage.googleapis.com/v1beta/interactions';
const DEFAULT_MODEL = 'gemini-3.8-flash';
const DEFAULT_EMBEDDING_MODEL = 'gemini-embedding-2';
const EMBEDDING_DIMENSIONS = 768;
const MAX_EVIDENCE = 32;

export type GeminiEvidence = {
  id: string;
  type: 'google_search' | 'code_execution' | 'url_context' | 'embedding';
  hash: string;
  createdAt: string;
  payload: unknown;
};

export class GeminiEvidenceLedger {
  private readonly entries = new Map<string, GeminiEvidence>();

  record(type: GeminiEvidence['type'], payload: unknown): GeminiEvidence {
    const raw = JSON.stringify(payload);
    const hash = createHash('sha256').update(raw).digest('hex');
    const id = 'gemini-evidence:' + type + ':' + hash.slice(0, 24);
    const evidence: GeminiEvidence = {
      id,
      type,
      hash,
      createdAt: new Date().toISOString(),
      payload,
    };
    this.entries.set(id, evidence);
    while (this.entries.size > MAX_EVIDENCE) {
      const oldest = this.entries.keys().next().value;
      if (!oldest) break;
      this.entries.delete(oldest);
    }
    return evidence;
  }

  get(id: string): GeminiEvidence | undefined {
    return this.entries.get(id.trim());
  }
}

type InteractionTool =
  | { type: 'google_search' }
  | { type: 'code_execution' }
  | { type: 'url_context' };

type InteractionResponse = {
  id?: string;
  output_text?: string;
  steps?: unknown[];
  error?: unknown;
};

function apiKey(): string {
  const key = (process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY ?? '').trim();
  if (!key) throw new Error('GEMINI_API_KEY_NOT_CONFIGURED');
  return key;
}

function model(): string {
  return (process.env.GEMINI_TOOLS_MODEL ?? DEFAULT_MODEL).trim() || DEFAULT_MODEL;
}

function embeddingModel(): string {
  return (process.env.GEMINI_EMBEDDING_MODEL ?? DEFAULT_EMBEDDING_MODEL).trim() || DEFAULT_EMBEDDING_MODEL;
}

async function postJson<T>(url: string, body: unknown, timeoutMs = 45_000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(1_000, timeoutMs));
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': apiKey(),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const raw = await response.text();
    let parsed: unknown = {};
    try {
      parsed = raw ? JSON.parse(raw) : {};
    } catch {
      throw new Error('GEMINI_INVALID_JSON_RESPONSE:' + response.status);
    }
    if (!response.ok) {
      const detail =
        typeof parsed === 'object' && parsed !== null
          ? JSON.stringify(parsed).slice(0, 2_000)
          : String(parsed);
      throw new Error('GEMINI_HTTP_' + response.status + ':' + detail);
    }
    return parsed as T;
  } finally {
    clearTimeout(timer);
  }
}

function collectModelText(steps: unknown[] | undefined): string {
  if (!Array.isArray(steps)) return '';
  const chunks: string[] = [];
  for (const rawStep of steps) {
    if (!rawStep || typeof rawStep !== 'object') continue;
    const step = rawStep as Record<string, unknown>;
    if (step.type !== 'model_output' || !Array.isArray(step.content)) continue;
    for (const rawBlock of step.content) {
      if (!rawBlock || typeof rawBlock !== 'object') continue;
      const block = rawBlock as Record<string, unknown>;
      if (typeof block.text === 'string' && block.text.trim()) chunks.push(block.text.trim());
    }
  }
  return chunks.join('\n\n').trim();
}

function collectCitations(steps: unknown[] | undefined): Array<{ title: string; url: string }> {
  if (!Array.isArray(steps)) return [];
  const seen = new Set<string>();
  const citations: Array<{ title: string; url: string }> = [];
  for (const rawStep of steps) {
    if (!rawStep || typeof rawStep !== 'object') continue;
    const step = rawStep as Record<string, unknown>;
    if (!Array.isArray(step.content)) continue;
    for (const rawBlock of step.content) {
      if (!rawBlock || typeof rawBlock !== 'object') continue;
      const block = rawBlock as Record<string, unknown>;
      if (!Array.isArray(block.annotations)) continue;
      for (const rawAnnotation of block.annotations) {
        if (!rawAnnotation || typeof rawAnnotation !== 'object') continue;
        const annotation = rawAnnotation as Record<string, unknown>;
        if (annotation.type !== 'url_citation') continue;
        const url = typeof annotation.url === 'string' ? annotation.url.trim() : '';
        if (!url || seen.has(url)) continue;
        seen.add(url);
        citations.push({
          title: typeof annotation.title === 'string' ? annotation.title.trim() : url,
          url,
        });
      }
    }
  }
  return citations;
}

function collectCodeExecution(steps: unknown[] | undefined): Array<{ code?: string; result?: unknown }> {
  if (!Array.isArray(steps)) return [];
  const executions: Array<{ code?: string; result?: unknown }> = [];
  let pending: { code?: string; result?: unknown } | null = null;
  for (const rawStep of steps) {
    if (!rawStep || typeof rawStep !== 'object') continue;
    const step = rawStep as Record<string, unknown>;
    if (step.type === 'code_execution_call') {
      pending = {
        code:
          typeof step.arguments === 'object' && step.arguments !== null
            ? String((step.arguments as Record<string, unknown>).code ?? '')
            : '',
      };
      executions.push(pending);
    } else if (step.type === 'code_execution_result') {
      if (pending) {
        pending.result = step.result;
        pending = null;
      } else {
        executions.push({ result: step.result });
      }
    }
  }
  return executions;
}

async function runInteraction(input: string, tools: InteractionTool[]): Promise<{
  interactionId: string;
  text: string;
  citations: Array<{ title: string; url: string }>;
  executions: Array<{ code?: string; result?: unknown }>;
}> {
  const response = await postJson<InteractionResponse>(INTERACTIONS_URL, {
    model: model(),
    input,
    tools,
  });
  const text = (response.output_text ?? collectModelText(response.steps)).trim();
  if (!text) throw new Error('GEMINI_EMPTY_MODEL_OUTPUT');
  return {
    interactionId: String(response.id ?? ''),
    text,
    citations: collectCitations(response.steps),
    executions: collectCodeExecution(response.steps),
  };
}

export async function geminiGoogleSearch(query: string) {
  const normalized = query.trim();
  if (!normalized) throw new Error('GEMINI_SEARCH_QUERY_REQUIRED');
  if (normalized.length > 16_000) throw new Error('GEMINI_SEARCH_QUERY_TOO_LARGE');
  return runInteraction(normalized, [{ type: 'google_search' }]);
}

export async function geminiCodeExecution(instruction: string) {
  const normalized = instruction.trim();
  if (!normalized) throw new Error('GEMINI_CODE_INSTRUCTION_REQUIRED');
  if (normalized.length > 32_000) throw new Error('GEMINI_CODE_INSTRUCTION_TOO_LARGE');
  return runInteraction(
    normalized +
      '\n\nExecute the Python needed to verify calculations or transform the supplied data. Return the verified result and keep the code execution evidence visible.',
    [{ type: 'code_execution' }],
  );
}

export async function geminiUrlContext(urls: string[], question: string) {
  const normalizedUrls = [...new Set(urls.map((value) => value.trim()).filter(Boolean))];
  if (normalizedUrls.length === 0) throw new Error('GEMINI_URLS_REQUIRED');
  if (normalizedUrls.length > 20) throw new Error('GEMINI_URLS_LIMIT_EXCEEDED');
  for (const url of normalizedUrls) {
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('invalid protocol');
    } catch {
      throw new Error('GEMINI_URL_INVALID:' + url);
    }
  }
  const normalizedQuestion = question.trim();
  if (!normalizedQuestion) throw new Error('GEMINI_URL_QUESTION_REQUIRED');
  const prompt = normalizedQuestion + '\n\nURLs:\n' + normalizedUrls.map((url) => '- ' + url).join('\n');
  return runInteraction(prompt, [{ type: 'url_context' }]);
}

export async function geminiEmbed(text: string) {
  const normalized = text.trim();
  if (!normalized) throw new Error('GEMINI_EMBED_TEXT_REQUIRED');
  if (normalized.length > 32_000) throw new Error('GEMINI_EMBED_TEXT_TOO_LARGE');

  const response = await postJson<{ embeddings?: Array<{ values?: number[] }> }>(
    'https://generativelanguage.googleapis.com/v1beta/models/' +
      encodeURIComponent(embeddingModel()) +
      ':embedContent',
    {
      content: { parts: [{ text: normalized }] },
      output_dimensionality: EMBEDDING_DIMENSIONS,
    },
    20_000,
  );

  const values = response.embeddings?.[0]?.values;
  if (
    !Array.isArray(values) ||
    values.length !== EMBEDDING_DIMENSIONS ||
    values.some((value) => !Number.isFinite(value))
  ) {
    throw new Error('GEMINI_EMBEDDING_RESPONSE_INVALID');
  }

  const hash = createHash('sha256').update(JSON.stringify(values)).digest('hex');
  return {
    model: embeddingModel(),
    dimensions: values.length,
    values,
    hash,
  };
}

export function createN05GeminiTools(ledger: GeminiEvidenceLedger, correlationId?: string) {
  return {
    geminiGoogleSearch: {
      description:
        'Ground a claim or research question in current Google Search results. Returns text and source citations. Use real evidence, not memory.',
      inputSchema: z.object({
        query: z.string().min(1).max(16_000),
      }),
      execute: async ({ query }: { query: string }) => {
        const result = await geminiGoogleSearch(query);
        const evidence = ledger.record('google_search', result);
        return {
          evidenceId: evidence.id,
          evidenceType: evidence.type,
          evidenceHash: evidence.hash,
          interactionId: result.interactionId,
          text: result.text,
          citations: result.citations,
        };
      },
    },
    geminiCodeExecution: {
      description:
        'Use Gemini Python code execution for deterministic calculations or verification. The execution result becomes auditable evidence.',
      inputSchema: z.object({
        instruction: z.string().min(1).max(32_000),
      }),
      execute: async ({ instruction }: { instruction: string }) => {
        const result = await geminiCodeExecution(instruction);
        const evidence = ledger.record('code_execution', result);
        return {
          evidenceId: evidence.id,
          evidenceType: evidence.type,
          evidenceHash: evidence.hash,
          interactionId: result.interactionId,
          text: result.text,
          executions: result.executions,
        };
      },
    },
    geminiUrlContext: {
      description:
        'Read one or more supplied URLs with Gemini URL Context and return the synthesized result plus URL citations.',
      inputSchema: z.object({
        urls: z.array(z.string().url()).min(1).max(20),
        question: z.string().min(1).max(16_000),
      }),
      execute: async ({
        urls,
        question,
      }: {
        urls: string[];
        question: string;
      }) => {
        const result = await geminiUrlContext(urls, question);
        const evidence = ledger.record('url_context', result);
        return {
          evidenceId: evidence.id,
          evidenceType: evidence.type,
          evidenceHash: evidence.hash,
          interactionId: result.interactionId,
          text: result.text,
          citations: result.citations,
        };
      },
    },
    geminiEmbed: {
      description:
        'Generate a 768-dimensional Gemini embedding for semantic memory, clustering and learning-context retrieval. The vector is real model output.',
      inputSchema: z.object({
        text: z.string().min(1).max(32_000),
      }),
      execute: async ({ text: value }: { text: string }) => {
        const result = await geminiEmbed(value);
        const evidence = ledger.record('embedding', result);
        return {
          evidenceId: evidence.id,
          evidenceType: evidence.type,
          evidenceHash: evidence.hash,
          model: result.model,
          dimensions: result.dimensions,
          values: result.values,
        };
      },
    },
    n07LearningFeedback: {
      description:
        'Send measured feedback to the N07 canonical learning machine. EvidenceId is mandatory and must refer to evidence produced by another Gemini tool in this same request; never invent it.',
      inputSchema: z.object({
        evidenceId: z.string().min(1),
        target: z.string().min(1).max(64),
        capability: z.string().min(1).max(256),
        reward: z.number().min(-1).max(1),
        confidence: z.number().min(0).max(1),
        outcome: z.string().min(1).max(256),
        justification: z.string().min(1).max(2_000),
      }),
      execute: async ({
        evidenceId,
        target,
        capability,
        reward,
        confidence,
        outcome,
        justification,
      }: {
        evidenceId: string;
        target: string;
        capability: string;
        reward: number;
        confidence: number;
        outcome: string;
        justification: string;
      }) => {
        const evidence = ledger.get(evidenceId);
        if (!evidence) throw new Error('GEMINI_EVIDENCE_NOT_FOUND:' + evidenceId);
        const bridge = new N07NeuralBridge('N05');
        const result = await bridge.feedback(
          reward,
          confidence,
          target,
          capability,
          outcome,
          'n05-gemini-evidence:' + evidence.type,
          correlationId,
        );
        return {
          status: result.status ?? 'ok',
          evidenceId,
          evidenceType: evidence.type,
          evidenceHash: evidence.hash,
          target,
          capability,
          reward,
          confidence,
          outcome,
          justification,
          correlationId: result.correlationId,
        };
      },
    },
  };
}
