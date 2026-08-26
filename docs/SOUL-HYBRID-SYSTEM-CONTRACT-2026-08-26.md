# Soul Hybrid System Contract — 2026-08-26

Soul is a GPU-like parallel cognitive fabric, not a CPU and not an AI provider. N01 is the user-facing Android APK and universal gateway into the complete fabric.

Six nuclei: N01..N06. Every nucleus has five logical IN and five logical OUT channels: 30 IN + 30 OUT = 60 directional channels. Never collapse this into 30.

Logical channels are transport-neutral and may use in-process, Android/WebView bridge, loopback HTTP, HTTP(S), or realtime transport. Transport selection does not change nucleus ownership.

N01 must expose the complete capability surface to the user. Specialist nuclei retain ownership and execution of their capabilities; N01 routes requests and returns results.

No nucleus owns a mandatory AI provider. AI-dependent tools consume the active Soul AI provider/session abstraction established through the APK WebView/browser session. They must fail truthfully when no provider is available.

Functional affinity: N01 runtime/gateway; N02 conversation; N03 perception/multimodal/context; N04 tools/documents/artifacts; N05 orchestration/dispatch; N06 cognition/synthesis/governance. Hierarchy guides routing but never blocks peer communication.

A route, registry, adapter, or health flag is not proof of connectivity. VERIFIED requires a real request through transport, destination handler execution, correlated response, and validation. Missing evidence must remain explicit.

Every connection must have a documented synergy/purpose and be tested for compatibility, ownership, correlation, fallback, and useful composition. Existing useful capabilities are preserved; defective implementations may be replaced behind stable contracts.
