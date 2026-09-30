# FASE 0 — N05 TOOLS / CAPABILITIES

## B1 — Identidade
Primário: inference e conversation dispatch.
Secundários: provider abstraction, Mesh, Clareira, peer registration, session/context.
Papel octacore: processador de inferência que transforma percepção/contexto em resposta e expande quando conectado a N03/N04/N06/N07.

## B2 — Processadores
| Nome | Path | Responsabilidade | Estado |
|---|---|---|---|
| Nucleus05Runtime | lib/soul-mesh/Nucleus05Runtime.ts | execução de capabilities N05 | ativo |
| N05CapabilityGateway | src/mesh/N05Capabilities | gateway de capacidades | ativo |
| SoulMeshAI | lib/soul-mesh/SoulMeshAI.ts | inference via AI SDK/provider | ativo quando provider |
| N05Registration | lib/soul-mesh/N05Registration.ts | handshake/heartbeat com N01 | ativo quando URLs |
| Mesh endpoint | app/api/soul-mesh/route.ts | boundary HTTP | ativo |

## B3 — Endpoints
| Método | Path | Estado |
|---|---|---|
| GET | /api/soul-mesh | LIVE quando deploy/auth |
| POST | /api/soul-mesh | LIVE quando deploy/auth |

Capabilities nativas incluem mesh.handshake, mesh.ping, mesh.describe, core.health e inference capabilities publicadas pelo runtime.

## B4 — Funções principais
| Módulo | Função | Assinatura resumida | Consumidores |
|---|---|---|---|
| SoulMeshAI | executeSoulInference | (input) => Promise<result> | Mesh/runtime |
| SoulMeshAI | soulInferenceCapabilities | () => models[] | discovery |
| endpoint | validateMeshMessage | (message) => true | route |
| endpoint | handleMeshMessage | (message,handlers?) => Promise<Message> | Mesh |
| N05Registration | registerN05 | () => Promise<status> | bootstrap |
| N05Registration | heartbeatN05 | () => Promise<boolean> | timer |

## B5/B6 — Eventos
Não foi encontrada, nesta rodada, uma enumeração fechada de EventBus interno para N05; a fronteira primária é HTTP Mesh request/response/event. Estado do inventário: PENDING para lista exaustiva.

## B7 — Externos
AI SDK/provider, XAI/provider configuration, Next.js/Vercel e infraestrutura de autenticação/session.

## B8 — Inter-núcleo
N01, N02, N03, N04, N06 e N07 via Soul Mesh 1.1.0. N05Registration possui caminho direto N05→N01 para handshake/health.

## B9 — Adormecidas
| Ferramenta | Requer | Estado |
|---|---|---|
| text inference | provider/credentials | BLOCKED_ENV se ausentes |
| N05→N01 registration | SOUL_MESH_N01_URL + auth | BLOCKED_ENV |
| peer probing | SOUL_MESH_Nx_URL | BLOCKED_ENV |
| Clareira forward | N01 reachable | BLOCKED_ENV |
| SARA boundary | SARA config | BLOCKED_ENV |

## B10 — Executáveis
mesh.ping/describe/health e gateway de inference são reais; inference só é considerado executável quando provider está configurado.

## B11 — Expansão
| Ao conectar | Ganha | Perde | Neutro |
|---|---|---|---|
| N03 | percepção → inference | nenhuma | provider |
| N04 | tools/documents → answer | nenhuma | conversation |
| N06 | sessão/contexto → inference | nenhuma | identity |
| N02 | conversa → inference | nenhuma | provider |
| N07 | orchestration → inference | nenhuma | local engine |
| N01 | Mesh/Clareira | nenhuma | inference ownership |
| SARA | audit/regeneration | nenhuma | provider |
