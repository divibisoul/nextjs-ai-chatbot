import test from 'node:test';
import assert from 'node:assert/strict';

import {
  GeminiEvidenceLedger,
  createN05GeminiTools,
  geminiEmbed,
  geminiGoogleSearch,
  geminiUrlContext,
} from './GeminiToolset';

function installFetch(handler: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) {
  const original = globalThis.fetch;
  globalThis.fetch = handler as typeof fetch;
  return () => {
    globalThis.fetch = original;
  };
}

test('Gemini search extracts model text and URL citations and records evidence', async () => {
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
    const toolResult = await tools.geminiGoogleSearch.execute({
      query: 'current test query',
    });
    assert.match(toolResult.evidenceId, /^gemini-evidence:google_search:/);
    assert.equal(toolResult.evidenceType, 'google_search');
    assert.equal(ledger.get(toolResult.evidenceId)?.hash, toolResult.evidenceHash);
  } finally {
    restore();
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
  }
});

test('Learning feedback requires evidence generated in the same ledger', async () => {
  const ledger = new GeminiEvidenceLedger();
  const tools = createN05GeminiTools(ledger, 'corr-feedback');
  await assert.rejects(
    () =>
      tools.n07LearningFeedback.execute({
        evidenceId: 'missing',
        target: 'N07',
        capability: 'neural.forward',
        reward: 1,
        confidence: 1,
        outcome: 'success',
        justification: 'no real evidence',
      }),
    /GEMINI_EVIDENCE_NOT_FOUND/,
  );
});
