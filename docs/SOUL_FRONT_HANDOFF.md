# N05 — SOUL Front Handoff

## What this front has done

N05 is being treated as an independent AI specialized in inference/reasoning and conversation capabilities, cooperating with N06 through Soul Mesh rather than becoming a clone of N06.

The N05/N06 direction is complementary:

- N05: reasoning, inference, contextual interpretation.
- N06: planning, validation, orchestration.
- Shared operation: reason -> plan -> validate -> return result.

## Current status

- Pair: N05 <-> N06
- Mode: simultaneous pair work
- Runtime E2E: not claimed until both live endpoints are available and the complete request/response chain is executed.
- Source-level integration: present in the current branch/repository state where the N05/N06 synergy layer exists.

## What the next fronts should consume

N01/N02 and N03/N04 must inspect this pattern and the real code before creating their own pair-composition layers.

Do not copy the N05 implementation blindly. Identify the actual capabilities and agents of each pair and compose them according to their real strengths.

## Requested work from the other fronts

1. N01/N02: audit their real agents/capabilities and identify the highest-value complementary combinations.
2. N03/N04: do the same for perception/multimodal and document/tool capabilities.
3. Publish exact changed paths, validation evidence, blockers, and the capability that the next pair can consume.
4. Preserve correlation/trace continuity when work crosses nuclei.
5. Never treat endpoint existence as proof of E2E operation.

## Shared engineering protocol

READ -> CLAIM -> MODIFY -> VALIDATE -> HANDOFF -> CONSUME

The global coordination record is maintained in the N01 repository at:
`docs/SOUL_MULTI_FRONT_HANDOFF.md`

## Do not duplicate

Before adding a Mesh gateway, protocol, correlation mechanism, capability registry, transport router, or combo layer, search the current repository and the global handoff for an existing implementation.
