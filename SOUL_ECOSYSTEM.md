# SOUL Ecosystem

**SOUL component:** N05 — chat, conhecimento e recuperação

This repository is a public component of the **SOUL ecosystem**. Upstream capabilities are attached by functional similarity and their original source remains with the upstream maintainers.

## Attached upstream capabilities
- **llama-index** — https://github.com/run-llama/llama_index.git — pinned at `962940ddc079cc21701d28d1237c84c82a7c5164`
- **browser-use** — https://github.com/browser-use/browser-use.git — pinned at `302d8fcb245a7a63fb7531a4734c9ce3c7792779`

Canonical SOUL integration map: https://github.com/divibisoul/Orquestrador-/blob/main/integrations/external-capabilities.json

## Functional integration boundary

The binding contract for this component is recorded in `integrations/capability-boundary.json`. It states why each upstream capability is present, the canonical routing boundary, the engineering agent responsible, and the evidence gate before runtime activation.

## 25-repository capability upgrade

This component participates in the shared SOUL 25-repository capability fabric. The local binding is recorded in `integrations/soul-25-augmentation.json`; external capabilities are consumed through the canonical N07 federation and remain evidence-gated.

## Runtime truth
Structural attachment is not a claim of runtime activation without adapters, configuration and end-to-end evidence.
