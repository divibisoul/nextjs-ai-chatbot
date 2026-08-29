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

## N05 implementation now present in code
- Gateway boundary wired to the real peer adapter.
- Ownership/consumer/fallback matrix reconciled against current peer implementations.
- Non-owned capabilities delegate to their owner/fallback instead of being falsely treated as local.
- Local inference/conversation registration retained.
- Model-aware inference cache includes prompt, system, temperature, model and output-token parameters with TTL.
- Bounded priority inference pool is connected to real `executeSoulInference`; N01-originated work receives highest queue priority.
- Peer-aware timeout/retry/circuit-breaker primitives are connected to remote delegation.
- Outgoing Mesh envelopes carry nonce and optional HMAC signature; incoming route validates signature, replay and rate limits.
- Typed distributed tracing primitives are present for correlation, source, target, capability and latency.
- E2E harness corrected to use canonical `N06` identity and optional HMAC signing.

## Completion dashboard — N05
Percentages are **engineering completion estimates based on verified code evidence**, not claims of live E2E success.

```text
Architecture / role          ████████████████████ 100%
Ownership / delegation       ████████████████████ 100%
Mesh gateway                 ███████████████████░  95%
Runtime capability wiring    ███████████████████░  95%
Transport integration        █████████████████░░░  85%
Resilience                   ██████████████████░░  90%
Cache / inference path       ███████████████████░  95%
Security / replay contract   █████████████████░░░  85%
Tracing / observability      ████████████████░░░░  80%
Discovery / registration     ████████░░░░░░░░░░░░  40%
E2E IA↔IA proof              ████░░░░░░░░░░░░░░░░  20%
CI verified                  ███░░░░░░░░░░░░░░░░░  15%
───────────────────────────────────────────────
OVERALL N05                  ████████████████░░░░  ~78%
```

## Remaining closure gates
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
Current OpenTelemetry JavaScript guidance supports stable traces/metrics for Node.js and recommends SDK initialization before application code; this is the reference direction for N05 observability rather than inventing a proprietary tracing system. See https://opentelemetry.io/docs/languages/js/.

## Current CI evidence
The repository contains `soul-mesh-ci.yml`, but no workflow run is currently observable for the latest commits through the available GitHub connector. CI therefore remains **unverified**, not green.
