import { Injectable, Inject } from '@nestjs/common';
import type { WeatherProvider, ForecastResponse, Coordinates } from '@windline/weather';
import { WEATHER_PROVIDER, ForecastRequest, coordsKey } from '@windline/weather';
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
    const coordinates: Coordinates[] = this.extractUniqueCoordinates(routePoints);

    const request: ForecastRequest = {
      coordinates,
      date,
      startHour,
      durationHours,
    };

    return this.weatherProvider.fetchForecast(request);
  }

  private extractUniqueCoordinates(points: RoutePoint[]): Coordinates[] {
    const seen = new Set<string>();
    const unique: Coordinates[] = [];

    for (const point of points) {
      const key = coordsKey({ lat: point.lat, lon: point.lon });
      if (!seen.has(key)) {
        seen.add(key);
        unique.push({ lat: point.lat, lon: point.lon });
      }
    }

    return unique;
  }
}
