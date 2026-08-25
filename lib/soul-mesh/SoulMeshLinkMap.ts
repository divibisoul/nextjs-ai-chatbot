import type { SoulMeshPeer } from './SoulMeshPeerMatrix';
export type SoulMeshLink = { local: 'chatbot'; peer: SoulMeshPeer; in: boolean; out: boolean };
export const R4_LINKS: SoulMeshLink[] = ['aeternum','nexus','eternium','chatbots','chatbot-2000'].map((peer) => ({ local: 'chatbot', peer: peer as SoulMeshPeer, in: true, out: true }));
