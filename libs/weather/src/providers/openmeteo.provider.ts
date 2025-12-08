import { MAX_FORECAST_DAYS } from '@windline/common';
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

interface OpenMeteoSingleResponse {
  latitude: number;
  longitude: number;
  hourly: OpenMeteoHourlyResponse;
}

type OpenMeteoResponse = OpenMeteoSingleResponse | OpenMeteoSingleResponse[];

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

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const requestDate = new Date(date);
    requestDate.setHours(0, 0, 0, 0);

    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + MAX_FORECAST_DAYS);

    if (requestDate < today) {
      throw new Error('Historical forecasts are not supported');
    }
    if (requestDate > maxDate) {
      throw new Error(`Forecast is only available up to ${MAX_FORECAST_DAYS} days ahead`);
    }

    /**
     * Deduplicate coordinates by coordsKey (0.01° grid).
     * Store mapping from key to rounded coordinates.
     */
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

    const coordsArray = Array.from(uniqueCoords.entries());
    const forecasts = new Map<string, HourlyForecast[]>();

    /**
     * Open-Meteo supports batch requests with multiple coordinates.
     * Single API call instead of N parallel requests.
     */
    const dateStr = date.toISOString().split('T')[0];
    const latitudes = coordsArray.map(([, c]) => c.lat).join(',');
    const longitudes = coordsArray.map(([, c]) => c.lon).join(',');

    const url = new URL(OPEN_METEO_API);
    url.searchParams.set('latitude', latitudes);
    url.searchParams.set('longitude', longitudes);
    url.searchParams.set('hourly', HOURLY_PARAMS);
    url.searchParams.set('timezone', 'auto');
    url.searchParams.set('start_date', dateStr);
    url.searchParams.set('end_date', dateStr);

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`Open-Meteo API error: ${response.status} ${response.statusText}`);
    }

    const data: OpenMeteoResponse = await response.json();

    /**
     * Response is array when multiple coordinates, single object otherwise.
     */
    const responses = Array.isArray(data) ? data : [data];

    for (let i = 0; i < coordsArray.length; i++) {
      const [key] = coordsArray[i];
      const locationData = responses[i];
      const hourlyForecasts = this.parseHourlyData(
        locationData.hourly,
        startHour,
        durationHours,
      );
      forecasts.set(key, hourlyForecasts);
    }

    return {
      forecasts,
      fetchedAt: new Date(),
    };
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
