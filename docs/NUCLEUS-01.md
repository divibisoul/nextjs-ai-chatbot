# Nucleus 01 — AI Interaction Processor

## Role

This repository is designated as Nucleus 01 in the six-directory fusion.

It is the AI interaction/reasoning processor: model routing, conversational processing, streaming, tool orchestration and persistence required by the existing chatbot application.

## Existing capabilities audited

- Next.js application runtime
- authenticated chat API
- model/provider routing
- reasoning model support
- streaming and resumable streams
- chat/history persistence
- document and suggestion tools
- request context/geolocation hints
- automated Playwright test suite

## Boundary

Nucleus 01 does NOT own Android platform control, hardware control, or Soul Sentinel runtime responsibilities.

## Mesh requirement

The nucleus must communicate through the shared Soul Protocol when integrated into the six-nucleus system. Existing communication mechanisms are not removed until their callers, receivers and behavior have been audited.

## Completion gate

Nucleus 01 is not considered complete until:

1. source inventory is complete;
2. responsibilities and dependencies are mapped;
3. duplicate/obsolete code is identified;
4. mesh adapter is implemented without breaking current chat behavior;
5. bidirectional protocol compatibility is defined;
6. build/lint/test evidence is obtained;
7. integration status is documented.
