# N07 Neural Fabric Handoff

N07 is the canonical orchestration/neural service. N05 retains its own domain and consumes N07 neural/prefrontal/compute capabilities through Soul Mesh.

Contract: `soul-mesh/1`, `1.1.0`; operations `neural.forward@1.0.0`, `neural.learn@1.0.0`.

Preserve correlationId, finite numeric payloads, nonce/HMAC, deadlines and explicit failure states. Read current N07 `main` before editing shared bridge files to avoid concurrent overwrite.

WHAT_CHANGED: N05 joined the shared N07 Neural Fabric contract.
WHAT_REMAINS: exact-head CI and live bidirectional commissioning.
WHAT_NEXT_AGENT_SHOULD_DO: keep N05 ownership intact and invoke N07 instead of cloning neural runtime code.
