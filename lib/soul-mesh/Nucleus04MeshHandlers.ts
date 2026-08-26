import { getWeatherData, type WeatherInput } from '@/lib/ai/tools/get-weather';

export type Nucleus04MeshHandler = (payload: unknown) => Promise<unknown> | unknown;

export const NUCLEUS_04_MESH_HANDLERS: Record<string, Nucleus04MeshHandler> = {
  getWeather: async (payload) => getWeatherData(payload as WeatherInput),
};
