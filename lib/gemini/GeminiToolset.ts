import { createHash } from 'node:crypto';
import { tool } from 'ai';
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

type LearningAssessment = {
  target: string;
  capability: string;
  reward: number;
  confidence: number;
  outcome: string;
  justification: string;
};

type GeminiFunctionCall = {
  name?: string;
  arguments?: unknown;
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

function collectFunctionCall(steps: unknown[] | undefined, name: string): GeminiFunctionCall | null {
  if (!Array.isArray(steps)) return null;
  for (const rawStep of steps) {
    if (!rawStep || typeof rawStep !== 'object') continue;
    const step = rawStep as Record<string, unknown>;
    if (step.type !== 'function_call') continue;
    const candidateName = typeof step.name === 'string' ? step.name.trim() : '';
    if (candidateName !== name) continue;
    return {
      name: candidateName,
      arguments: step.arguments,
    };
  }
  return null;
}

function normalizeLearningAssessment(raw: unknown, target: string, capability: string): LearningAssessment {
  if (!raw || typeof raw !== 'object') throw new Error('GEMINI_LEARNING_ASSESSMENT_INVALID');
  const value = raw as Record<string, unknown>;
  const assessedTarget = typeof value.target === 'string' ? value.target.trim() : '';
  const assessedCapability = typeof value.capability === 'string' ? value.capability.trim() : '';
  const reward = typeof value.reward === 'number' ? value.reward : Number(value.reward);
  const confidence = typeof value.confidence === 'number' ? value.confidence : Number(value.confidence);
  const outcome = typeof value.outcome === 'string' ? value.outcome.trim() : '';
  const justification = typeof value.justification === 'string' ? value.justification.trim() : '';
  if (!assessedTarget || assessedTarget !== target.trim()) throw new Error('GEMINI_LEARNING_ASSESSMENT_TARGET_MISMATCH');
  if (!assessedCapability || assessedCapability !== capability.trim()) throw new Error('GEMINI_LEARNING_ASSESSMENT_CAPABILITY_MISMATCH');
  if (!Number.isFinite(reward) || reward < -1 || reward > 1) throw new Error('GEMINI_LEARNING_ASSESSMENT_REWARD_INVALID');
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 0.85) throw new Error('GEMINI_LEARNING_ASSESSMENT_CONFIDENCE_INVALID');
  if (!outcome || outcome.length > 256) throw new Error('GEMINI_LEARNING_ASSESSMENT_OUTCOME_INVALID');
  if (!justification || justification.length > 2_000) throw new Error('GEMINI_LEARNING_ASSESSMENT_JUSTIFICATION_INVALID');
  return { target: target.trim(), capability: capability.trim(), reward, confidence, outcome, justification };
}

async function assessEvidenceWithGemini(
  evidence: GeminiEvidence,
  target: string,
  capability: string,
): Promise<LearningAssessment & { interactionId: string }> {
  if (evidence.type === 'embedding') {
    throw new Error('GEMINI_EMBEDDING_CANNOT_GRADE_EXECUTION_OUTCOME');
  }
  const evidenceJson = JSON.stringify({
    evidenceId: evidence.id,
    evidenceType: evidence.type,
    evidenceHash: evidence.hash,
    payload: evidence.payload,
  }).slice(0, 24_000);

  const response = await postJson<InteractionResponse>(INTERACTIONS_URL, {
    model: model(),
    input:
      'Assess the observed execution evidence for learning. Do not invent facts. ' +
      'The requested target and capability are fixed and must be returned exactly. ' +
      'Assign reward in [-1,1] and confidence in [0,0.85]. Confidence is epistemic confidence, not success probability. ' +
      'Return the structured function call only.\n\n' +
      'Target: ' + target.trim() + '\nCapability: ' + capability.trim() +
      '\nEvidence:\n' + evidenceJson,
    tools: [
      {
        type: 'function',
        name: 'emit_learning_assessment',
        description: 'Emit a bounded learning assessment from supplied execution evidence.',
        parameters: {
          type: 'object',
          additionalProperties: false,
          properties: {
            target: { type: 'string' },
            capability: { type: 'string' },
            reward: { type: 'number', minimum: -1, maximum: 1 },
            confidence: { type: 'number', minimum: 0, maximum: 0.85 },
            outcome: { type: 'string', minLength: 1, maxLength: 256 },
            justification: { type: 'string', minLength: 1, maxLength: 2000 },
          },
          required: ['target', 'capability', 'reward', 'confidence', 'outcome', 'justification'],
        },
      },
    ],
  });
  const call = collectFunctionCall(response.steps, 'emit_learning_assessment');
  if (!call) throw new Error('GEMINI_LEARNING_ASSESSMENT_FUNCTION_NOT_CALLED');
  let args = call.arguments;
  if (typeof args === 'string') {
    try {
      args = JSON.parse(args);
    } catch {
      throw new Error('GEMINI_LEARNING_ASSESSMENT_ARGUMENTS_INVALID_JSON');
    }
  }
  const assessment = normalizeLearningAssessment(args, target, capability);
  return { ...assessment, interactionId: String(response.id ?? '') };
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

export type N05MemoryContext = {
  userId: string;
  sessionId: string;
};

export function createN05GeminiTools(
  ledger: GeminiEvidenceLedger,
  correlationId?: string,
  memoryContext?: N05MemoryContext,
) {
  return {
    geminiGoogleSearch: tool({
      description:
        'Ground a claim or research question in current Google Search results. Returns text and source citations. Use real evidence, not memory.',
      inputSchema: z.object({
        query: z.string().min(1).max(16_000),
      }),
      execute: async ({ query }) => {
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
    }),
    geminiCodeExecution: tool({
      description:
        'Use Gemini Python code execution for deterministic calculations or verification. The execution result becomes auditable evidence.',
      inputSchema: z.object({
        instruction: z.string().min(1).max(32_000),
      }),
      execute: async ({ instruction }) => {
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
    }),
    geminiUrlContext: tool({
      description:
        'Read one or more supplied URLs with Gemini URL Context and return the synthesized result plus URL citations.',
      inputSchema: z.object({
        urls: z.array(z.string().url()).min(1).max(20),
        question: z.string().min(1).max(16_000),
      }),
      execute: async ({ urls, question }) => {
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
    }),
    geminiEmbed: tool({
      description:
        'Generate a 768-dimensional Gemini embedding for semantic memory, clustering and learning-context retrieval. The vector is real model output.',
      inputSchema: z.object({
        text: z.string().min(1).max(32_000),
      }),
      execute: async ({ text: value }) => {
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
    }),
    n07MemoryRecord: tool({
      description:
        'Persist an evidence-backed semantic memory in N07/Supabase. The embeddingEvidenceId must reference a real 768-dimensional embedding produced by geminiEmbed in this same request.',
      inputSchema: z.object({
        embeddingEvidenceId: z.string().min(1),
        summary: z.string().min(1).max(8_000),
        tags: z.array(z.string().min(1).max(64)).max(32).default([]),
      }),
      execute: async ({ embeddingEvidenceId, summary, tags }) => {
        if (!memoryContext) throw new Error('N05_MEMORY_CONTEXT_UNAVAILABLE');
        const evidence = ledger.get(embeddingEvidenceId);
        if (!evidence || evidence.type !== 'embedding') {
          throw new Error('GEMINI_EMBEDDING_EVIDENCE_NOT_FOUND:' + embeddingEvidenceId);
        }
        const payload = evidence.payload;
        if (!payload || typeof payload !== 'object') throw new Error('GEMINI_EMBEDDING_EVIDENCE_INVALID');
        const values = (payload as Record<string, unknown>).values;
        if (
          !Array.isArray(values) ||
          values.length !== EMBEDDING_DIMENSIONS ||
          values.some((value) => typeof value !== 'number' || !Number.isFinite(value))
        ) {
          throw new Error('GEMINI_EMBEDDING_EVIDENCE_DIMENSIONS_INVALID');
        }
        const bridge = new N07NeuralBridge('N05');
        const result = await bridge.recordMemory(
          values,
          summary,
          tags ?? [],
          memoryContext.userId,
          memoryContext.sessionId,
          evidence.id,
          evidence.hash,
          String((payload as Record<string, unknown>).model ?? embeddingModel()),
          correlationId,
        );
        return {
          status: result.status ?? 'ok',
          stored: result.status === 'ok',
          evidenceId: evidence.id,
          evidenceHash: evidence.hash,
          correlationId: result.correlationId,
          target: 'N07',
        };
      },
    }),
    n07MemorySearch: tool({
      description:
        'Retrieve the user’s top semantic memories using a fresh Gemini embedding and N07 pgvector similarity search. Default threshold is 0.75 and default count is 5.',
      inputSchema: z.object({
        query: z.string().min(1).max(16_000),
        similarityThreshold: z.number().min(0).max(1).default(0.75),
        count: z.number().int().min(1).max(20).default(5),
      }),
      execute: async ({ query, similarityThreshold, count }) => {
        if (!memoryContext) throw new Error('N05_MEMORY_CONTEXT_UNAVAILABLE');
        const embedded = await geminiEmbed(query);
        const evidence = ledger.record('embedding', embedded);
        const bridge = new N07NeuralBridge('N05');
        const result = await bridge.searchMemory(
          embedded.values,
          memoryContext.userId,
          similarityThreshold,
          count,
          correlationId,
        );
        return {
          status: result.status ?? 'ok',
          evidenceId: evidence.id,
          evidenceHash: evidence.hash,
          model: embedded.model,
          dimensions: embedded.dimensions,
          matches: result.matches,
          matchCount: result.matches.length,
          correlationId: result.correlationId,
        };
      },
    }),
    n07LearningFeedback: tool({
      description:
        'Assess real Gemini/Search/Code/URL evidence with Gemini function calling, then send the bounded assessment to the N07 canonical learning machine. EvidenceId must come from a preceding evidence-producing tool call in this same request.',
      inputSchema: z.object({
        evidenceId: z.string().min(1),
        target: z.string().min(1).max(64),
        capability: z.string().min(1).max(256),
      }),
      execute: async ({ evidenceId, target, capability }) => {
        const evidence = ledger.get(evidenceId);
        if (!evidence) throw new Error('GEMINI_EVIDENCE_NOT_FOUND:' + evidenceId);
        const assessment = await assessEvidenceWithGemini(evidence, target, capability);
        const bridge = new N07NeuralBridge('N05');
        const result = await bridge.feedback(
          assessment.reward,
          assessment.confidence,
          assessment.target,
          assessment.capability,
          assessment.outcome,
          'n05-gemini-function:' + evidence.type,
          correlationId,
        );
        return {
          status: result.status ?? 'ok',
          evidenceId,
          evidenceType: evidence.type,
          evidenceHash: evidence.hash,
          ...assessment,
          interactionId: assessment.interactionId,
          correlationId: result.correlationId,
        };
      },
    }),
  };
}
