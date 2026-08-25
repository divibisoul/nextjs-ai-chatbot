import type { SoulMeshMessage } from './SoulMeshProtocol';

export async function sendSoulMeshMessage(endpoint: string, message: SoulMeshMessage, token?: string): Promise<SoulMeshMessage> {
  const response = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(message) });
  if (!response.ok) throw new Error(`Soul Mesh request failed: ${response.status}`);
  return response.json() as Promise<SoulMeshMessage>;
}
