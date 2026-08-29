# N05 Mesh Status

## Role
N05 is the Soul **INFERENCE ENGINE**. Its authoritative capability families are `inference.*` and `conversation.*`.

## Cross-nucleus reconciliation — 2026-08-28
This map was re-audited against the current implementations of N01–N06 before optimizing N05.

- **N01**: latest work hardens envelope freshness/replay protection, capability authorization, transport/envelope contracts and self-tests. N05 therefore preserves `timestamp`/`nonce` metadata and must treat N01 as the control-plane peer.
- **N02**: current Mesh work includes HTTP, browser bridge, realtime WebSocket, hybrid transport fallback and correlation context. N05 keeps HTTP JSON compatibility and now delegates through the canonical peer client rather than assuming one transport.
- **N03**: current endpoint exposes executable `audio.transcribe`, `audio.analyze.emotion` and `speech.synthesize` through a Mesh router. N05 therefore recognizes both `audio.*` and `speech.*` as N03-owned families.
- **N04**: current endpoint is a Next.js Mesh runtime with verified transport/discovery work. N04 remains the N05 delegation target for `document.*`.
- **N06**: current ownership contract declares `cognitive.*` and `tool.*` owned by N06 with N04 as a tool fallback. N05 was previously stale on this point; its ownership matrix is now reconciled.

## Capability ownership
- inference.* → **N05**; fallback N02
- conversation.* → **N05**; fallback N02
- document.* → **N04**; fallback N06
- audio.* → **N03**; fallback N01
- speech.* → **N03**; fallback N01
- cognitive.* → **N06**; fallback N05 → N02
- tool.* → **N06**; fallback N04

N05 is a consumer of the non-owned families. It must delegate them rather than returning a false local capability result.

## Capability map
- inference.reason → N05
- inference.analyze → N05
- inference.summarize → N05
- inference.translate → N05
- inference.classify → N05
- conversation.chat → N05
- conversation.memory → N05

## Implemented infrastructure
- `src/mesh/N05MeshGateway.ts` — single Mesh/runtime boundary; delegates non-owned capabilities to the current owner/fallback chain.
- `src/mesh/N05OwnershipMatrix.ts` — reconciled owner/consumer/fallback policy.
- `src/mesh/N05Capabilities.ts` — specialized inference/conversation registration.
- `src/mesh/N05InferenceCache.ts` — model-aware TTL cache.
- `src/mesh/N05Resilience.ts` — timeout, circuit breaker and exponential backoff primitives.
- `src/mesh/N05Tracing.ts` — distributed trace metadata.
- `scripts/test-n6-n5-n6.mjs` — N06 → N05 → N06 proof harness.

## Validation status
Structural changes are applied, but N05 is **not considered E2E verified** until the real runtime and peer endpoints pass CI and live cross-nucleus tests.

Required gates:
- `npm run typecheck`
- `npm run build`
- capability execution tests
- N06 → N05 → N06 E2E
- N01 registration/heartbeat
- rate limit, timeout and circuit-breaker tests
- owner/fallback delegation tests
