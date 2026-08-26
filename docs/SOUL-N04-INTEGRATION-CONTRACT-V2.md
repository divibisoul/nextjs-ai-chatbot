# N04 Integration Contract v2

N04 remains the tools, documents and artifacts nucleus. Existing document and tool handlers are preserved.

## Canonical identity
N04 peers are N01, N02, N03, N05 and N06.

## Five IN / five OUT
N04 exposes five logical IN and five logical OUT channels, one bidirectional pair for each other nucleus.

## Hybrid transport
Channels negotiate IN_PROCESS, WEBVIEW_BRIDGE, LOOPBACK_HTTP, HTTP or REALTIME without changing logical channel identity.

## Capability ownership
Tools and artifact handlers remain executable in N04. A registry entry is not itself execution. Remote invocation must reach the real handler and return a correlated result.

## Synergy
N04 consumes interaction/context from N02/N03 and orchestration from N05, and supplies concrete tool/artifact results to N01/N02/N05/N06. The APK can expose every N04 capability through the N01 universal gateway without moving ownership into N01.

## Proof rule
No success response may be emitted for a request that did not execute a real handler.
