import { ForecastRequest, ForecastResponse } from './weather.types';

export interface WeatherProvider {
  fetchForecast(request: ForecastRequest): Promise<ForecastResponse>;
}

export const WEATHER_PROVIDER = Symbol('WEATHER_PROVIDER');
