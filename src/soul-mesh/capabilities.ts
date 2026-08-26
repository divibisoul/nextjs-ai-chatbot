export const SOUL_CAPABILITIES = {
  chatReason: { id: 'chat.reason', execution: 'WEB_SESSION' as const },
  history: { id: 'chat.history', execution: 'WEB_SESSION' as const },
  tools: { id: 'chat.tools', execution: 'WEB_SESSION' as const },
};

export function soulCapability(id: string) {
  return Object.values(SOUL_CAPABILITIES).find(capability => capability.id === id);
}
