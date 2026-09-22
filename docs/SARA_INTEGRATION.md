# N05 ↔ SARA

N05 has a server-side SARA client. When SARA_ENABLE_CHAT=true and credentials are configured, each non-empty textual user message is sent to SARA before the model prompt is built.

Environment: SARA_ENABLE_CHAT, SARA_BASE_URL, SARA_API_TOKEN.

The returned cycle_id, state, convergence, rollback state, execution evidence and trace hash are appended as context. The original N05 chat/tool/streaming path remains intact.

If SARA is unavailable, the failure is recorded and the native N05 flow remains available; the integration never fabricates a SARA result.