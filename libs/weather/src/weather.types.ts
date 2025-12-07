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

export function coordsKey(coords: Coordinates): string {
  return `${coords.lat.toFixed(2)},${coords.lon.toFixed(2)}`;
}
