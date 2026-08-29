# N05 ↔ N06 Agent Synergy

N05 and N06 remain independent IAs. The synergy layer composes existing capabilities instead of replacing them.

## Complementary roles

- N05.reasoner: inference, semantic analysis and contextual reasoning.
- N05.contextualizer: conversation/context capabilities.
- N06.planner: transforms N05 reasoning into executable plans.
- N06.validator: evaluates N06 plans/results and identifies defects.

## Canonical flow

`N05.reasoner → N06.planner → N06.validator`

The same `correlationId` and `traceId` are carried through every stage. This allows the whole cooperative operation to be observed as one distributed task rather than unrelated HTTP calls.

The layer is additive: existing N05 runtime, N06 runtime and Soul Mesh transports remain authoritative.
