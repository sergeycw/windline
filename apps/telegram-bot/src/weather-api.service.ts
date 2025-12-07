import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const FETCH_TIMEOUT_MS = 30000;

interface ForecastSummary {
  temperatureMin: number;
  temperatureMax: number;
  windSpeedMin: number;
  windSpeedMax: number;
  windGustsMax: number;
  precipitationProbabilityMax: number;
  precipitationTotal: number;
}

interface ForecastResponse {
  routeId: string;
  routeName: string;
  date: string;
  startHour: number;
  durationHours: number;
  summary: ForecastSummary;
  fetchedAt: string;
}

interface ForecastResult {
  success: boolean;
  data?: ForecastResponse;
  error?: string;
}

@Injectable()
export class WeatherApiService {
  private readonly logger = new Logger(WeatherApiService.name);
  private readonly apiUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.apiUrl = this.configService.get<string>('API_URL') || 'http://localhost:3000';
  }

  async getForecast(
    routeId: string,
    date: Date,
    startHour: number,
    durationHours: number,
  ): Promise<ForecastResult> {
    try {
      const response = await fetch(`${this.apiUrl}/weather/forecast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          routeId,
          date: date.toISOString().split('T')[0],
          startHour,
          durationHours,
        }),
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.warn(`Weather API error: ${response.status} - ${errorText}`);
        return { success: false, error: 'Failed to fetch weather forecast' };
      }

      const data: ForecastResponse = await response.json();
      return { success: true, data };
    } catch (error) {
      this.logger.error('Weather fetch failed', error instanceof Error ? error.stack : error);

      if (error instanceof Error && error.name === 'TimeoutError') {
        return { success: false, error: 'Weather request timed out' };
      }

      return { success: false, error: 'Failed to fetch weather' };
    }
  }

  formatForecast(forecast: ForecastResponse): string {
    const { summary } = forecast;
    const date = new Date(forecast.date);
    const dateStr = date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });

    const lines = [
      `🌤 Weather forecast for ${dateStr}:`,
      '',
      `🌡 Temperature: ${summary.temperatureMin}–${summary.temperatureMax}°C`,
      `💨 Wind: ${summary.windSpeedMin}–${summary.windSpeedMax} km/h`,
    ];

    if (summary.windGustsMax > summary.windSpeedMax) {
      lines.push(`💨 Gusts up to ${summary.windGustsMax} km/h`);
    }

    if (summary.precipitationProbabilityMax > 0) {
      lines.push(`🌧 Precipitation: ${summary.precipitationProbabilityMax}% chance`);
    }

    if (summary.precipitationTotal > 0) {
      lines.push(`💧 Expected: ${summary.precipitationTotal} mm`);
    }

    return lines.join('\n');
  }
}
