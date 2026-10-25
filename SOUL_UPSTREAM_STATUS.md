# N05 — Public upstream integration status
**Snapshot:** 2026-10-25 · **Inspected N05 main:** `b631a010f70663958b93fd9bb265f53493e7f971`  
**Audit branch:** `audit/ai-nucleus-status-2026-10-25`

## Sources pinned

| Public source | Pinned SHA | N05 use | State |
|---|---|---|---|
| [LlamaIndex](https://github.com/run-llama/llama_index) | `962940ddc079cc21701d28d1237c84c82a7c5164` | Retrieval, document indexing and RAG | Source pinned; no N05 production retrieval E2E proven |
| [Browser Use](https://github.com/browser-use/browser-use) | `302d8fcb245a7a63fb7531a4734c9ce3c7792779` | Browser retrieval augmentation | Source pinned; N05 browser execution not proven |

## Native AI and integration boundaries

- `lib/soul-mesh/SoulMeshAI.ts` calls the local configured AI SDK provider via `generateText`, or dispatches `gemini-n02` to N02 capability `ai.generate` and validates the returned `text`.
- `integrations/capability-boundary.json` describes LlamaIndex/browser as N05 RAG/browser augmentation but runtime is `PROJECTED`.
- N07's generic LlamaIndex handler builds an index over text included in the input request and retrieves matches. This is a bounded sample path, not proof of persistent production indexing, correct document permissions, stable memory, or query round-trip.
- For browser augmentation, reuse explicit tool authorization and domain policy. The browser framework must not gain arbitrary tool privileges outside N05's native dispatcher.

## Runtime/documentation issue to reconcile

N05 `src/mesh/N05InferencePool.ts` currently schedules `executeSoulInference()` in an in-process queue and returns `piscinaEnabled: false`. `MESH_STATUS.md` mentions a Piscina worker path, but current `package.json` does not declare Piscina. Correct the status claim or implement/validate the worker contract; do not report the worker as active before exact-head tests prove it.

## Required proof

1. Add/verify retrieval tests for exact text → index → query → result, limits, citation/source ID and empty/error behavior.
2. Verify N05→N02 inference round-trip separately from LlamaIndex RAG and browser use.
3. Check source pin vs imported Python package/runtime version; run typecheck, Mesh/HMAC/ExecutionGuard tests and exact-head CI.
4. Preserve owner, auth and correlation across N05 native capability → N07 → upstream result → return.

**Gate:** `SOURCE_PINNED / ADAPTER_PLANNED / RUNTIME_UNVERIFIED`.
