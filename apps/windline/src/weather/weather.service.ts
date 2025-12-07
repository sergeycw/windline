import { Injectable, Inject } from '@nestjs/common';
import type { WeatherProvider, ForecastResponse } from '@windline/weather';
import { WEATHER_PROVIDER, ForecastRequest, sampleRouteForWeather } from '@windline/weather';
import type { RoutePoint } from '@windline/gpx';

@Injectable()
export class WeatherService {
  constructor(
    @Inject(WEATHER_PROVIDER)
    private readonly weatherProvider: WeatherProvider,
  ) {}

  async getForecastForRoute(
    routePoints: RoutePoint[],
    date: Date,
    startHour: number,
    durationHours: number,
  ): Promise<ForecastResponse> {
    const coordinates = sampleRouteForWeather(routePoints);

    const request: ForecastRequest = {
      coordinates,
      date,
      startHour,
      durationHours,
    };

    return this.weatherProvider.fetchForecast(request);
  }
}
