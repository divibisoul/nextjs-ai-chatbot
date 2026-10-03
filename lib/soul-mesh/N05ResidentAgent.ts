export const N05_RESIDENT_AGENT = {
  id: 'N05.resident',
  name: 'Agent-Conversation Steward',
  nucleus: 'N05',
  version: '1.0.0',
  role: 'conversation-dispatch-execution',
  executionMode: 'embedded-local-worker',
  lifecycle: 'BOUND',
  repositoryWrite: false,
  superpowers: {
    revision: '8ca22dba9a94f28898bbce59f2537ff4d87c747d',
    mode: 'development-methodology-and-skill-pack',
    runtimePolicyEngine: false,
  },
  skills: ['subagent-driven-development','requesting-code-review','systematic-debugging','verification-before-completion'],
  publishedCapabilities: ['mesh.health','mesh.discovery','mesh.resident.describe@1.0.0','chat.*','dispatch.*','browser.*','retrieval.*','retrieval.llama-index@1.0.0','mesh.supergpu.execute@1.0.0','superagi.fabric.execute@1.0.0'],
  authority: 'N05 owns conversation dispatch/execution; Chat UX remains the existing public surface.',
  evidence: 'soul-evidence/1',
} as const;
