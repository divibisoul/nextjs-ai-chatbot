# N05 ↔ SARA

N05 possui cliente SARA server-side. Quando SARA_ENABLE_CHAT=true e as credenciais estão configuradas, cada mensagem textual não vazia pode ser submetida ao ciclo SARA antes da construção do prompt do modelo.

Ambiente: SARA_ENABLE_CHAT, SARA_BASE_URL, SARA_API_TOKEN.

Além de `sara.cycle` e `sara.trace`, o cliente agora expõe, de forma aditiva, `sara.health`, `sara.capabilities`, `sara.state`, `sara.audit` e `sara.regenerate`. Assim, o núcleo conversacional pode consumir auditoria, regeneração, estado, descoberta de capacidades e rastreabilidade sem duplicar ARA/ETR/ITR.

O fluxo original de chat, ferramentas e streaming permanece intacto. Se o SARA estiver indisponível, a falha é registrada e o fluxo nativo do N05 continua disponível; nenhum resultado do SARA é fabricado.

### Clareira frontier
Este núcleo pode consultar, de forma somente leitura, a operação SARA `sara.clareira.audit` (`GET /v1/clareira/audit`). O resultado é evidência derivada do fluxo ERU → MMD → RGO → Tríade → Clareira; não concede autoridade para mutar outro núcleo.

