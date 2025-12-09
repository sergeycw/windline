import {
  ForecastRequest,
  ForecastResponse,
  TimedForecastRequest,
  TimedForecastResponse,
} from './weather.types';

export interface WeatherProvider {
  fetchForecast(request: ForecastRequest): Promise<ForecastResponse>;
  fetchTimedForecast(request: TimedForecastRequest): Promise<TimedForecastResponse>;
}

export const WEATHER_PROVIDER = Symbol('WEATHER_PROVIDER');
