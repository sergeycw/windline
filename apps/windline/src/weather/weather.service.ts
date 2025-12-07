import { Injectable, Inject } from '@nestjs/common';
import type { WeatherProvider, ForecastResponse, WindImpact, HourlyForecast, Coordinates } from '@windline/weather';
import {
  WEATHER_PROVIDER,
  ForecastRequest,
  sampleRouteForWeather,
  calculateWindImpact,
} from '@windline/weather';
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

  calculateWindImpact(
    routePoints: RoutePoint[],
    forecasts: Map<string, HourlyForecast[]>,
  ): WindImpact {
    const forecastKeys = Array.from(forecasts.keys());
    const forecastCoords = forecastKeys.map((key) => {
      const [lat, lon] = key.split(',').map(Number);
      return { key, lat, lon };
    });

    const segments: { bearing: number; windDirection: number; windSpeed: number }[] = [];

    for (const point of routePoints) {
      if (point.bearing === undefined) continue;

      const nearest = this.findNearestForecast(point, forecastCoords);
      if (!nearest) continue;

      const hourlyForecasts = forecasts.get(nearest.key);
      if (!hourlyForecasts || hourlyForecasts.length === 0) continue;

      const avgWindSpeed =
        hourlyForecasts.reduce((sum, f) => sum + f.windSpeed, 0) / hourlyForecasts.length;
      const avgWindDirection =
        hourlyForecasts.reduce((sum, f) => sum + f.windDirection, 0) / hourlyForecasts.length;

      segments.push({
        bearing: point.bearing,
        windDirection: avgWindDirection,
        windSpeed: avgWindSpeed,
      });
    }

    return calculateWindImpact(segments);
  }

  private findNearestForecast(
    point: Coordinates,
    forecastCoords: { key: string; lat: number; lon: number }[],
  ): { key: string } | null {
    if (forecastCoords.length === 0) return null;

    let nearest = forecastCoords[0];
    let minDistance = this.squaredDistance(point, nearest);

    for (let i = 1; i < forecastCoords.length; i++) {
      const dist = this.squaredDistance(point, forecastCoords[i]);
      if (dist < minDistance) {
        minDistance = dist;
        nearest = forecastCoords[i];
      }
    }

    return nearest;
  }

  private squaredDistance(a: Coordinates, b: { lat: number; lon: number }): number {
    const dLat = a.lat - b.lat;
    const dLon = a.lon - b.lon;
    return dLat * dLat + dLon * dLon;
  }
}
