import { getWeatherData, type WeatherInput } from '@/lib/ai/tools/get-weather';

export type Nucleus04MeshHandler = (payload: unknown) => Promise<unknown> | unknown;

export const NUCLEUS_04_MESH_HANDLERS: Record<string, Nucleus04MeshHandler> = {
  getWeather: async (payload) => getWeatherData(payload as WeatherInput),
  'mesh.health': () => ({ nucleus: 'N04', status: 'ready', transport: 'hybrid' }),
  'mesh.handshake': (payload) => ({ nucleus: 'N04', connected: true, peer: (payload as { source?: string })?.source ?? null }),
  'mesh.capabilities': () => ({ nucleus: 'N04', capabilities: Object.keys(NUCLEUS_04_MESH_HANDLERS) }),
};
