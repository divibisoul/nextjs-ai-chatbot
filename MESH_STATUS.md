# N05 Mesh Status

## Role
N05 is the Soul **INFERENCE ENGINE**. Its authoritative capability families are `inference.*` and `conversation.*`.

## Capability map
- inference.reason → N05
- inference.analyze → N05
- inference.summarize → N05
- inference.translate → N05
- inference.classify → N05
- conversation.chat → N05
- conversation.memory → N05
- document.* → N04 (N05 is consumer)
- audio.* → N03 (N05 does not own)
- tool.* → N04 (N05 is consumer)

## Implemented infrastructure
- `src/mesh/N05MeshGateway.ts` — single Mesh/runtime boundary and structured capability errors.
- `src/mesh/N05OwnershipMatrix.ts` — owner/consumer/fallback policy.
- `src/mesh/N05Capabilities.ts` — specialized capability registration.
- `src/mesh/N05InferenceCache.ts` — model-aware TTL cache.
- `src/mesh/N05Resilience.ts` — timeout, circuit breaker and exponential backoff primitives.
- `src/mesh/N05Tracing.ts` — distributed trace metadata.
- `scripts/test-n6-n5-n6.mjs` — E2E proof harness.

## Validation status
This document records implementation state only. A capability is **not considered E2E verified** until the real N05 server and N06 peer are running and the validation commands pass.

Required gates:
- `npm run typecheck`
- `npm run build`
- all ten capability checks
- N6 → N5 → N6 E2E
- N01 registration/heartbeat
- rate limit, timeout and circuit-breaker tests
