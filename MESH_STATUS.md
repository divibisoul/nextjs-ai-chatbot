# N05 Mesh Status

## Role
N05 is the Soul **INFERENCE ENGINE**. Its authoritative capability families are `inference.*` and `conversation.*`.

## Source of truth
GitHub `main` is the authoritative implementation state. Conversation claims are never treated as proof of implementation. The cumulative audit branch was merged as PR #7; no prior N05 work was reset.

## 2026-08-29 cumulative audit findings and immediate corrections
- **Ownership contradiction found:** `src/mesh/N05OwnershipMatrix.ts` previously declared N02 as owner of `inference.*`/`conversation.*` while N05 documentation and the N05 role require N05 ownership. Corrected to N05 with N02 fallback.
- **Capability authorization gap found:** the legacy N05 gateway was checking a capability registry that did not contain concrete `inference.*` operations. It now authorizes against the canonical N05 ownership matrix while retaining the capability registry for declarations.
- **Module boundary failure found:** `lib/soul-mesh/N05MeshGateway.ts` imported a non-existent local `./capabilities` path. Corrected to the existing canonical `src/soul-mesh/capabilities` module.
- **Runtime identity failure found:** `Nucleus05Runtime` generated local requests with N01 identity. Corrected to N05 and added timestamp/nonce metadata.
- **Cache coverage gap found:** `ai.infer` bypassed the stateless inference cache. Corrected so all non-conversation inference capabilities use the model-aware TTL cache; conversation remains uncached.
- **Worker-pool gap found:** `N05InferencePool` was only an in-process queue despite a Piscina dependency and worker file. It now has CPU-aware concurrency and a real Piscina execution path when a compiled production worker URL is supplied, with an explicit safe fallback to the existing async provider path when it is not.
- **Transport gap found:** peer traffic had no adaptive transport abstraction. Added `N05AdaptiveTransportRouter` and routed current HTTP traffic through it with health, latency and reliability scoring; additional transports can be registered without changing the Mesh contract.
- **Outbound security gap found:** N05 peer envelopes were not signing HMAC headers. Corrected to sign outbound envelopes when `SOUL_MESH_HMAC_SECRET` is configured.
- **Discovery mismatch found:** N05 registration was documented as a registry endpoint that N01 does not expose. Corrected registration to use N01's canonical `mesh.handshake` path through Soul Mesh, with `mesh.health` heartbeat and exponential recovery.
- **Trace propagation gap found:** the HTTP route now forwards `traceId` into the executable gateway and returns it with correlated responses.

## Canonical cross-nucleus direction
N01–N06 are six **independent IAs**. Soul Mesh is the cooperative layer through which they discover, request, execute, respond and delegate work. No parallel API is introduced.

## Capability ownership
- inference.* → **N05**; fallback N02
- conversation.* → **N05**; fallback N02
- document.* → **N04**; fallback N06
- audio.* → **N03**; fallback N01
- speech.* → **N03**; fallback N01
- cognitive.* → **N06**; fallback N05 → N02
- tool.* → **N04** in the current N05 execution matrix; fallback N06

## N05 implementation evidence now present
- Single executable gateway class exists and is used by the HTTP Mesh route.
- Ownership, consumer and fallback routing is explicit.
- Local inference/conversation agents are registered through the gateway.
- Stateless inference uses model-aware TTL cache; conversation bypasses cache.
- Priority scheduling gives N01-originated requests maximum queue priority.
- CPU-aware concurrency defaults to available CPU count and can be configured.
- Piscina integration is available through `N05_PISCINA_WORKER_URL` without falsely claiming an uncompiled TypeScript worker is production-ready.
- Peer timeout, retry, exponential backoff and circuit breaker remain active.
- Adaptive transport routing is active for current HTTP peer transport.
- Incoming route enforces authorization, replay protection, rate limiting and signature validation.
- Outgoing peer traffic signs HMAC when configured.
- Registration uses the N01 Mesh handshake contract rather than an invented `/register` endpoint.
- Gateway unit tests now cover N05 ownership and replay rejection.

## Completion dashboard
Percentages below are **structural engineering estimates from repository evidence**, not claims of live end-to-end execution.

```text
Repository audit / reconciliation ████████████████████ 100%
N05 identity / ownership         ████████████████████ 100%
Gateway / handler boundary       ████████████████████ 100%
Runtime capability wiring        ███████████████████░  95%
Cache / inference path           ████████████████████ 100%
Resilience                       ███████████████████░  95%
Security / replay / HMAC         ██████████████████░░  90%
Adaptive transport               █████████████████░░░  85%
Discovery / registration          ███████████████░░░░░  75%
Agent/capability composition      ███████████████░░░░░  75%
E2E IA↔IA proof                   ██████░░░░░░░░░░░░░░  30%
CI/typecheck/build evidence       ████░░░░░░░░░░░░░░░░  20%
──────────────────────────────────────────────────────
STRUCTURAL N05                   █████████████████░░░  ~86%
```

## Validation evidence
- PR #7 was merged into `main` at commit `75ee5bfe63412f8fa0185205274edc24f644234d`.
- The PR dependency-review workflow ran and failed; rerunning the same job also failed. The connector did not expose the job log payload, so the exact dependency finding is not being guessed or marked resolved.
- No live CI run for the merge commit is currently observable through the available GitHub workflow-run query.

## Remaining closure gates
1. Run repository typecheck/build and correct every compiler failure.
2. Execute the N05 gateway tests and Mesh route tests in CI.
3. Verify N05 ↔ N01 handshake against a running N01 instance.
4. Verify N05 ↔ N02/N03/N04/N06 real capability delegation.
5. Prove N06 → N05 → N06 inference with correlation and identity preserved.
6. Validate adaptive transport behavior with at least two available transports when peers expose them.
7. Diagnose the dependency-review failure from GitHub Actions logs when those logs become accessible; do not suppress the check merely to obtain green status.
8. Record actual CI/E2E evidence here; never convert static evidence into a live-success claim.

## Research basis
Piscina's current guidance supports worker pools for appropriate workloads but notes that worker threads can add overhead for already-asynchronous I/O; N05 therefore keeps the existing async inference path as the safe default and makes Piscina an explicit production-worker mode rather than blindly moving provider I/O into workers. OpenTelemetry's JavaScript guidance recommends initializing the SDK before application code and using the API for manual tracing; N05 preserves its lightweight correlation contract and can be upgraded to full OTel SDK initialization at application bootstrap.

## Coordination handoff
**WHAT_CHANGED:** ownership reconciliation, gateway authorization/module resolution, N05 identity, cache coverage, Piscina-capable scheduler, adaptive transport, outbound HMAC, N01 handshake registration, trace propagation, tests.

**WHAT_WAS_FOUND:** multiple previous implementations existed but several were disconnected or contradictory; the most serious were the N02/N05 ownership contradiction, the missing gateway capability module path, and N01 identity leakage in N05 runtime execution.

**WHAT_REMAINS:** runtime commissioning and CI/E2E evidence, plus the next N05↔N04 and N05↔N06 composition passes.

**WHAT_NEXT_AGENT_SHOULD_DO:** inspect the current `main` GitHub state first; do not recreate any listed component. Continue from the remaining closure gates and verify against the peer repositories before adding new interfaces.
