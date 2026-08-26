import { tool } from 'ai';
import { z } from 'zod';

export const weatherInputSchema = z.object({ latitude: z.number(), longitude: z.number() });
export type WeatherInput = z.infer<typeof weatherInputSchema>;

export async function getWeatherData({ latitude, longitude }: WeatherInput) {
  const response = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m&hourly=temperature_2m&daily=sunrise,sunset&timezone=auto`,
  );
  if (!response.ok) throw new Error(`WEATHER_PROVIDER_HTTP_${response.status}`);
  return response.json();
}

export const getWeather = tool({
  description: 'Get the current weather at a location',
  inputSchema: weatherInputSchema,
  execute: getWeatherData,
});
