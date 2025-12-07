import { registerAs } from '@nestjs/config';

export type WeatherProviderType = 'openmeteo' | 'openweathermap';

export const weatherConfig = registerAs('weather', () => ({
  provider: (process.env.WEATHER_PROVIDER || 'openmeteo') as WeatherProviderType,
  openWeatherMapApiKey: process.env.OPENWEATHERMAP_API_KEY,
}));
