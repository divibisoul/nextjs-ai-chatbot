# N07 Neural Fabric Handoff

N07 is the canonical orchestration/neural service. N05 retains its own domain and consumes N07 neural/prefrontal/compute capabilities through Soul Mesh.

Contract: `soul-mesh/1`, `1.1.0`; operations `neural.forward@1.0.0`, `neural.learn@1.0.0`.

Preserve correlationId, finite numeric payloads, nonce/HMAC, deadlines and explicit failure states. Read current N07 `main` before editing shared bridge files to avoid concurrent overwrite.

WHAT_CHANGED: N05 joined the shared N07 Neural Fabric contract.
WHAT_REMAINS: exact-head CI and live bidirectional commissioning.
WHAT_NEXT_AGENT_SHOULD_DO: keep N05 ownership intact and invoke N07 instead of cloning neural runtime code.


## Orbital reasoning / Prefrontal consumer contract — 2026-10-01

This nucleus remains the owner of its native agents and tools. It may consume the N07 canonical capabilities through the existing Soul Mesh when the runtime needs resource simulation or risk-bearing admission:

- `transcendental.estimate@1.0.0` — N07 TCE deterministic resource simulation; simulation evidence only, never physical-hardware evidence.
- `prefrontal.orbital.evaluate@1.0.0` — N07 TCE evidence combined with the canonical Prefrontal admission boundary.

The local agent/tool must preserve the existing `correlationId`, `traceId`, Mesh authentication/deadline contract and its own ownership. This is a consumer path, not a copied TCE/Prefrontal runtime.
