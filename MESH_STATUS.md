# N05 Mesh Status

## Role
N05 is the Soul **INFERENCE ENGINE**. Its authoritative capability families are `inference.*` and `conversation.*`.

## Cross-nucleus direction
N01–N06 are six **independent IAs**. Soul Mesh is the cooperative layer through which they discover, request, execute, respond and delegate work. This does not create a parallel API and does not replace any existing runtime, provider or transport.

## Reconciliation with current peers — 2026-08-28
- **N01**: hardened envelope freshness/replay protection, capability authorization, transport/envelope contracts and self-tests. N05 preserves timestamp/nonce metadata.
- **N02**: Mesh work includes HTTP, browser bridge, realtime WebSocket, hybrid transport fallback and correlation context. N05 delegates through the canonical peer adapter.
- **N03**: executable `audio.transcribe`, `audio.analyze.emotion` and `speech.synthesize`; N03 owns `audio.*` and `speech.*`.
- **N04**: Next.js Mesh runtime; N04 owns `document.*`.
- **N06**: current ownership contract declares `cognitive.*` and `tool.*`; N04 is the `tool.*` fallback.

## Capability ownership
- inference.* → **N05**; fallback N02
- conversation.* → **N05**; fallback N02
- document.* → **N04**; fallback N06
- audio.* → **N03**; fallback N01
- speech.* → **N03**; fallback N01
- cognitive.* → **N06**; fallback N05 → N02
- tool.* → **N06**; fallback N04

## N05 implementation completed so far
- Gateway boundary created and wired to the real peer adapter.
- Ownership/consumer/fallback matrix reconciled against current peer implementations.
- Non-owned capabilities delegate to their owner/fallback instead of being falsely treated as local.
- Local inference/conversation registration retained.
- Inference cache integrated without caching stateful conversation operations.
- Existing adaptive transport infrastructure retained rather than duplicated.
- Correlation/security metadata preserved.
- Architecture directive committed to repository documentation.

## Completion dashboard — N05
Percentages are **engineering completion estimates based on verified code evidence**, not claims of live E2E success.

```text
Architecture / role          ████████████████████ 100%
Ownership / delegation       ████████████████████ 100%
Mesh gateway                 ██████████████████░░  90%
Runtime capability wiring    █████████████████░░░  85%
Transport integration        ████████████████░░░░  80%
Resilience                   ███████████████░░░░░  75%
Cache / inference path       █████████████████░░░  85%
Security / replay contract   ██████████████░░░░░░  70%
Discovery / registration     ████████░░░░░░░░░░░░  40%
E2E IA↔IA proof              ████░░░░░░░░░░░░░░░░  20%
CI verified                  ███░░░░░░░░░░░░░░░░░  15%
───────────────────────────────────────────────
OVERALL N05                  ███████████████░░░░░  ~72%
```

## What remains before N05 can be called finished
1. Verify the real Mesh envelope against N01/N02 contracts.
2. Close N05 registration/discovery using the **actual** N01 discovery mechanism; do not invent `/register` if N01 does not expose it.
3. Prove N05 can receive a request from another IA, execute a real capability and return a correlated response.
4. Prove N05 can delegate to N03/N04/N06 and return the remote result.
5. Prove the N06 → N05 → N06 inference circuit.
6. Run typecheck/build and fix every resulting error.
7. Run resilience, ownership and delegation tests.
8. Record actual CI/E2E evidence here.

## Important validation rule
A `200`, `ping`, file presence or static contract is **not** counted as IA↔IA communication. Completion requires a real request → capability execution → response path with identity, source, target and correlation preserved.

## External engineering research
Current OpenTelemetry JavaScript guidance supports stable traces/metrics for Node.js and recommends SDK initialization before application code; this is the reference direction for the N05 observability layer rather than inventing a proprietary tracing system. See https://opentelemetry.io/docs/languages/js/.

## Current CI evidence
The repository contains `soul-mesh-ci.yml`, but the latest inspected commit has no associated workflow run available through the GitHub connector. Therefore CI is **not** marked green until an actual run is observed.
