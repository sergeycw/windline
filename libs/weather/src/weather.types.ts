export const WEATHER_SAMPLING_DISTANCE_METERS = 10000;
export const WEATHER_COORD_PRECISION = 2;

export interface Coordinates {
  lat: number;
  lon: number;
}

export interface HourlyForecast {
  time: Date;
  temperature: number;
  apparentTemperature: number;
  precipitation: number;
  precipitationProbability: number;
  windSpeed: number;
  windDirection: number;
  windGusts: number;
  weatherCode: number;
}

export interface ForecastRequest {
  coordinates: Coordinates[];
  date: Date;
  startHour: number;
  durationHours: number;
}

export interface ForecastResponse {
  forecasts: Map<string, HourlyForecast[]>;
  fetchedAt: Date;
}

export interface WindDistribution {
  headwindPercent: number;
  tailwindPercent: number;
  crosswindPercent: number;
}

export interface WindImpact {
  headwind: number;
  tailwind: number;
  crosswind: number;
  distribution: WindDistribution;
}

export interface SegmentWindImpact {
  headComponent: number;
  crossComponent: number;
  isHeadwind: boolean;
}

export function coordsKey(coords: Coordinates): string {
  return `${coords.lat.toFixed(WEATHER_COORD_PRECISION)},${coords.lon.toFixed(WEATHER_COORD_PRECISION)}`;
}
