# N05 — Soul Mesh Architecture Directive

## Canonical direction

N01–N07 are **seven independent AIs**. Each nucleus owns its own runtime, agents, tools and capabilities. Soul Mesh is not a second application API and is not a replacement for the existing runtimes. It is the interoperability layer through which the independent AIs discover one another, request work, execute owned capabilities, return results and delegate work to another nucleus when appropriate.

This directive is **additive**. It does not invalidate or remove previous N05 Mesh, inference, resilience, cache, transport or documentation work.

## Required behavior of every nucleus

1. Mesh input — receive a canonical Soul Mesh message.
2. Identity — expose its canonical N01–N07 identity.
3. Agents/capabilities — advertise the work that this AI can actually execute.
4. Mesh output — request work from another AI through the Mesh layer.
5. Response — return the result with the original correlation ID.
6. Discovery — resolve available peers and their capabilities.
7. Delegation — forward work to the appropriate owner/fallback rather than fabricating a local result.
8. Correlation — preserve request/response lineage across multi-hop work.

## N05 role

N05 remains the **Inference Engine**. It owns `inference.*` and `conversation.*`, while consuming capabilities owned by other nuclei through Soul Mesh.

Current ownership reconciliation:

- `inference.*` → N05
- `conversation.*` → N05
- `document.*` → N04
- `audio.*` → N03
- `speech.*` → N03
- `cognitive.*` → N06
- `tool.*` → N06

N05 therefore must be both an independent AI and a cooperative Mesh participant.

## Implementation rule

Existing runtime implementations remain authoritative. Mesh adapters wrap/connect them; they must not create simulated AI behavior merely to satisfy an endpoint test.

The N05 endpoint now routes ordinary capability requests through `N05MeshGateway`, which executes N05-owned handlers or delegates non-owned capabilities to their current owner/fallback. The gateway uses lazy peer-adapter loading to avoid an endpoint/adapter module cycle.

## N01 ↔ N02 reference circuit

The next cross-nucleus validation target is a real N01 ↔ N02 circuit. N02 already has a canonical `SoulMeshProtocol` and a `N02CapabilityRuntime` connected to its AI provider. That pattern is the reference for subsequent nucleus integration.

Do not create a parallel API solely for this purpose. Existing HTTP/browser/realtime transports remain transport implementations beneath the Mesh contract.

## Acceptance rule

A route is not considered functional because it returns HTTP 200, `mesh.ping`, or `status: ok`. A Mesh capability is functional only when an independent nucleus sends a canonical request, the target AI executes a real owned capability, and the response returns through the Mesh with correlation preserved.

Final integration requires progressively proving N01↔N02, then the remaining nuclei, before declaring the 42 directed logical connections (21 bidirectional pairs) operational.
