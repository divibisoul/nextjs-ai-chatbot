# Nucleus 01 — AI Interaction Processor

Repository role in the unified Soul/Aeternum system:

**AI Interaction / Reasoning Processor**

This repository is treated as a processing nucleus, not as the final system by itself.

## Responsibilities

- user-facing conversational interaction
- AI model/provider routing
- streaming response orchestration
- conversation/session state
- document and artifact interaction where already supported
- persistence through its existing database layer
- presentation/API boundary for the web application

## Must NOT own

- Android platform control
- hardware control duplicated from Android
- Soul Sentinel internals
- system-wide event authority
- unilateral ownership of the inter-core mesh

## Fusion boundary

The nucleus communicates through the shared Soul Protocol. Existing integrations must be audited before replacement.

The canonical future direction is:

`AI Interaction Processor <-> Soul Protocol <-> other nuclei`

## Processor model

Input processors:
- user messages
- conversation context
- authorized documents/artifacts
- incoming nucleus events

Processing:
- model/provider selection
- context assembly
- response generation
- tool orchestration
- persistence

Output processors:
- streamed responses
- structured events
- requests to other nuclei
- acknowledgements/results

## Non-destructive migration

This stage adds architectural metadata only. Existing application behavior is preserved. No existing API, provider, database, or event path is removed here.
