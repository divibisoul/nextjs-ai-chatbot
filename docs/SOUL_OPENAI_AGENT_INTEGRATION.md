# N05 — OpenAI Agent/Provider Integration Boundary

## Status

IMPLEMENTED AS OPTIONAL PROVIDER ADAPTER.

N05 remains the inference/conversation owner. The OpenAI provider is additive and server-side. Existing xAI remains available as the fallback when the explicit OpenAI flag or API key is absent.

## What was added

- Direct dependency on `@ai-sdk/openai-compatible@1.0.0-beta.2`, using the package already resolved in the repository lockfile.
- `SOUL_OPENAI_PROVIDER_ENABLED` feature gate.
- Server-side `OPENAI_API_KEY`, `OPENAI_BASE_URL` and `OPENAI_MODEL` configuration.
- OpenAI provider selection in the existing `myProvider` model factory.
- Existing chat/artifact/reasoning routes remain intact.

## Why this boundary

The AI SDK OpenAI-compatible provider supports text generation, streaming, tool calling, structured outputs and multimodal inputs when the target provider supports them. The configured default points to the official OpenAI API base URL.

Official reference used for the provider contract:
https://ai-sdk.dev/providers/openai-compatible-providers

Official OpenAI agent reference:
https://github.com/openai/openai-agents-js

## SOUL ownership rule

OpenAI is a provider/tooling layer, not a new nucleus.

Client → N07 public ingress → canonical Soul Mesh → N05 inference capability → configured provider.

Any N05 tool execution that affects another nucleus must continue through the N05 Mesh gateway and canonical SOUL Mesh ownership. Provider calls must not become a second bus or a private cross-nucleus transport.

## Agent capabilities to add progressively

- function/tool calling → N04/N06/SOUL capability registry
- MCP tools → existing capability ownership boundary
- agent handoffs / specialist delegation → N02/N04/N05/N06 without duplicating ownership
- sessions → N05/N06 plus SARA durable memory
- tracing → existing correlation/trace plus provider traces
- realtime voice → N03 owns audio/realtime perception
- sandbox execution → isolated adapter only; never unrestricted host execution
- web/file/code tools → explicit capability registration and governance

## Validation gates

STRUCTURAL: provider dependency and server-gated configuration are present.
CI: exact-head typecheck/build/tests must pass.
RUNTIME: requires `SOUL_OPENAI_PROVIDER_ENABLED=true` plus a valid server-side `OPENAI_API_KEY` and a live provider request.
E2E: requires N07 → N05 → OpenAI provider with correlation/provenance preserved.

No provider is marked ONLINE from configuration alone.

## Latest validation correction
CI exposed two unsupported assumptions and they were corrected without rollback: provider settings now match the installed `@ai-sdk/openai-compatible` version, and the existing Clareira accepted-packet metric is represented in the shared contract. The dependency-review workflow has passed; exact-head typecheck remains the promotion gate.
