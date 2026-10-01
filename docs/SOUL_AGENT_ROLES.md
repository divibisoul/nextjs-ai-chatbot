# N05 — agentes e responsabilidades locais

Os agentes são registrados em `src/mesh/N05Capabilities.ts` por `N05AgentRegistry`.

| Agente | Responsabilidade |
|---|---|
| N05-inference-agent | Inferência, análise, resumo, tradução, classificação, chat e processamento de memória conversacional; usa o model router/pool N05. |
| N05-gemini-tool-agent | Executar Google Search, Code Execution, URL Context e embeddings expostos pelo toolset N05. |
| N05-n06-collaboration-agent | Entregar `support.ai-pilot` ao N06 pelo Mesh existente; não duplicar o executor N06. |

**Não pertence ao N05:** provedor Gemini canônico N02, execução de ferramentas/documentos N04 ou orquestração/fusão N07.
