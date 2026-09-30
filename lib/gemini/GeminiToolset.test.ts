import test from 'node:test';
import assert from 'node:assert/strict';

import {
  GeminiEvidenceLedger,
  createN05GeminiTools,
  geminiEmbed,
  geminiGoogleSearch,
  geminiUrlContext,
} from './GeminiToolset';

function withFakeGeminiKey() {
  const previous = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = 'test-gemini-key';
  return () => {
    if (previous === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previous;
  };
}

function installFetch(handler: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) {
  const original = globalThis.fetch;
  globalThis.fetch = handler as typeof fetch;
  return () => {
    globalThis.fetch = original;
  };
}

async function executeTool(execute: unknown, input: unknown): Promise<unknown> {
  if (typeof execute !== 'function') throw new Error('TEST_TOOL_EXECUTE_MISSING');
  return (execute as (args: unknown, options: unknown) => Promise<unknown>)(input, {});
}

test('Gemini search extracts model text and URL citations and records evidence', async () => {
  const restoreKey = withFakeGeminiKey();
  const restore = installFetch(async (_input, _init) =>
    new Response(
      JSON.stringify({
        id: 'interaction-search-1',
        output_text: 'Verified search answer.',
        steps: [
          {
            type: 'model_output',
            content: [
              {
                text: 'Verified search answer.',
                annotations: [
                  {
                    type: 'url_citation',
                    title: 'Source A',
                    url: 'https://example.com/a',
                  },
                ],
              },
            ],
          },
        ],
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    ),
  );

  try {
    const result = await geminiGoogleSearch('current test query');
    assert.equal(result.text, 'Verified search answer.');
    assert.deepEqual(result.citations, [
      { title: 'Source A', url: 'https://example.com/a' },
    ]);

    const ledger = new GeminiEvidenceLedger();
    const tools = createN05GeminiTools(ledger, 'corr-test');
    const toolResult = await executeTool(tools.geminiGoogleSearch.execute, {
      query: 'current test query',
    }) as { evidenceId: string; evidenceType: string; evidenceHash: string };
    assert.match(toolResult.evidenceId, /^gemini-evidence:google_search:/);
    assert.equal(toolResult.evidenceType, 'google_search');
    assert.equal(ledger.get(toolResult.evidenceId)?.hash, toolResult.evidenceHash);
  } finally {
    restore();
    restoreKey();
  }
});

test('Gemini URL context rejects non-http URLs before network access', async () => {
  let called = false;
  const restore = installFetch(async () => {
    called = true;
    return new Response('{}', { status: 200 });
  });
  try {
    await assert.rejects(
      () => geminiUrlContext(['file:///etc/passwd'], 'inspect'),
      /GEMINI_URL_INVALID/,
    );
    assert.equal(called, false);
  } finally {
    restore();
  }
});

test('Gemini embeddings reject malformed vector dimensions', async () => {
  const restoreKey = withFakeGeminiKey();
  const restore = installFetch(async () =>
    new Response(
      JSON.stringify({
        embeddings: [{ values: [0.1, 0.2] }],
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    ),
  );
  try {
    await assert.rejects(
      () => geminiEmbed('embedding test'),
      /GEMINI_EMBEDDING_RESPONSE_INVALID/,
    );
  } finally {
    restore();
    restoreKey();
  }
});

test('Learning feedback requires evidence generated in the same ledger', async () => {
  const ledger = new GeminiEvidenceLedger();
  const tools = createN05GeminiTools(ledger, 'corr-feedback');
  await assert.rejects(
    () =>
      executeTool(tools.n07LearningFeedback.execute, {
        evidenceId: 'missing',
        target: 'N07',
        capability: 'neural.forward',
      }),
    /GEMINI_EVIDENCE_NOT_FOUND/,
  );
});


test('Gemini learning assessment requires a structured function call and uses its result', async () => {
  const restoreKey = withFakeGeminiKey();
  const calls: unknown[] = [];
  const restore = installFetch(async (input, init) => {
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    calls.push(body);
    return new Response(
      JSON.stringify({
        id: 'interaction-assess-1',
        steps: [
          {
            type: 'function_call',
            name: 'emit_learning_assessment',
            arguments: {
              target: 'N07',
              capability: 'gemini.test',
              reward: 0.75,
              confidence: 0.8,
              outcome: 'provider_success',
              justification: 'Observed provider output and explicit evidence.',
            },
          },
        ],
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  });
  try {
    const ledger = new GeminiEvidenceLedger();
    const evidence = ledger.record('google_search', {
      text: 'Observed result',
      citations: [{ title: 'Source', url: 'https://example.com/source' }],
    });
    const tools = createN05GeminiTools(ledger, 'corr-assess');
    await assert.rejects(
      () =>
        executeTool(tools.n07LearningFeedback.execute, {
          evidenceId: evidence.id,
          target: 'N07',
          capability: 'gemini.test',
        }),
      /N07|SOUL_N07_URL|GEMINI/,
    );

    assert.ok(calls.length >= 1);
    const request = calls[0] as Record<string, unknown>;
    const declaredTools = request.tools as Array<Record<string, unknown>>;
    assert.equal(declaredTools[0]?.type, 'function');
    assert.equal(declaredTools[0]?.name, 'emit_learning_assessment');
  } finally {
    restore();
  }
});
