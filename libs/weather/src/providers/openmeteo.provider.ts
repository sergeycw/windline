import { WeatherProvider } from '../weather-provider.interface';
import {
  ForecastRequest,
  ForecastResponse,
  HourlyForecast,
  coordsKey,
} from '../weather.types';

interface OpenMeteoHourlyResponse {
  time: string[];
  temperature_2m: number[];
  apparent_temperature: number[];
  precipitation: number[];
  precipitation_probability: number[];
  wind_speed_10m: number[];
  wind_direction_10m: number[];
  wind_gusts_10m: number[];
  weather_code: number[];
}

interface OpenMeteoResponse {
  latitude: number;
  longitude: number;
  hourly: OpenMeteoHourlyResponse;
}

const OPEN_METEO_API = 'https://api.open-meteo.com/v1/forecast';

const HOURLY_PARAMS = [
  'temperature_2m',
  'apparent_temperature',
  'precipitation',
  'precipitation_probability',
  'wind_speed_10m',
  'wind_direction_10m',
  'wind_gusts_10m',
  'weather_code',
].join(',');

export class OpenMeteoProvider implements WeatherProvider {
  async fetchForecast(request: ForecastRequest): Promise<ForecastResponse> {
    const { coordinates, date, startHour, durationHours } = request;

    const uniqueCoords = new Map<string, { lat: number; lon: number }>();
    for (const coord of coordinates) {
      const key = coordsKey(coord);
      if (!uniqueCoords.has(key)) {
        uniqueCoords.set(key, {
          lat: parseFloat(coord.lat.toFixed(2)),
          lon: parseFloat(coord.lon.toFixed(2)),
        });
      }
    }

    const forecasts = new Map<string, HourlyForecast[]>();

    const fetchPromises = Array.from(uniqueCoords.entries()).map(
      async ([key, coord]) => {
        const hourlyForecasts = await this.fetchSingleLocation(
          coord.lat,
          coord.lon,
          date,
          startHour,
          durationHours,
        );
        return { key, hourlyForecasts };
      },
    );

    const results = await Promise.all(fetchPromises);

    for (const { key, hourlyForecasts } of results) {
      forecasts.set(key, hourlyForecasts);
    }

    return {
      forecasts,
      fetchedAt: new Date(),
    };
  }

  private async fetchSingleLocation(
    lat: number,
    lon: number,
    date: Date,
    startHour: number,
    durationHours: number,
  ): Promise<HourlyForecast[]> {
    const dateStr = date.toISOString().split('T')[0];

    const url = new URL(OPEN_METEO_API);
    url.searchParams.set('latitude', lat.toString());
    url.searchParams.set('longitude', lon.toString());
    url.searchParams.set('hourly', HOURLY_PARAMS);
    url.searchParams.set('timezone', 'auto');
    url.searchParams.set('start_date', dateStr);
    url.searchParams.set('end_date', dateStr);

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`Open-Meteo API error: ${response.status} ${response.statusText}`);
    }

    const data: OpenMeteoResponse = await response.json();

    return this.parseHourlyData(data.hourly, startHour, durationHours);
  }

  private parseHourlyData(
    hourly: OpenMeteoHourlyResponse,
    startHour: number,
    durationHours: number,
  ): HourlyForecast[] {
    const forecasts: HourlyForecast[] = [];

    const endHour = Math.min(startHour + durationHours, hourly.time.length);

    for (let i = startHour; i < endHour; i++) {
      forecasts.push({
        time: new Date(hourly.time[i]),
        temperature: hourly.temperature_2m[i],
        apparentTemperature: hourly.apparent_temperature[i],
        precipitation: hourly.precipitation[i],
        precipitationProbability: hourly.precipitation_probability[i],
        windSpeed: hourly.wind_speed_10m[i],
        windDirection: hourly.wind_direction_10m[i],
        windGusts: hourly.wind_gusts_10m[i],
        weatherCode: hourly.weather_code[i],
      });
    }

    return forecasts;
  }
}
