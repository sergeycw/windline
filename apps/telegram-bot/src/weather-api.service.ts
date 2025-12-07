import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FETCH_TIMEOUT_MS } from '@windline/common';
import { formatDateISO } from '@windline/common';
import type { ForecastSummary, WindImpactData } from '@windline/entities';

interface ForecastResponse {
  requestId: string;
  routeId: string;
  routeName: string;
  date: string;
  startHour: number;
  durationHours: number;
  summary: ForecastSummary;
  windImpact: WindImpactData;
  fetchedAt: string;
  cached: boolean;
}

interface ForecastResult {
  success: boolean;
  data?: ForecastResponse;
  error?: string;
}

interface ForecastImageResult {
  success: boolean;
  buffer?: Buffer;
  error?: string;
}

@Injectable()
export class WeatherApiService {
  private readonly logger = new Logger(WeatherApiService.name);
  private readonly apiUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.apiUrl = this.configService.getOrThrow<string>('API_URL');
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
          date: formatDateISO(date),
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

  async getForecastImage(
    routeId: string,
    date: Date,
    startHour: number,
    durationHours: number,
  ): Promise<ForecastImageResult> {
    try {
      const response = await fetch(`${this.apiUrl}/weather/forecast/image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          routeId,
          date: formatDateISO(date),
          startHour,
          durationHours,
        }),
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });

      if (!response.ok) {
        this.logger.warn(`Weather image API error: ${response.status}`);
        return { success: false, error: 'Failed to generate map image' };
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      return { success: true, buffer };
    } catch (error) {
      this.logger.error('Weather image fetch failed', error instanceof Error ? error.stack : error);
      return { success: false, error: 'Failed to generate map' };
    }
  }

  formatForecast(forecast: ForecastResponse): string {
    const { summary, windImpact } = forecast;
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

    lines.push('');
    lines.push('🧭 Wind impact on route:');
    lines.push(
      `  ▲ Headwind: ${windImpact.distribution.headwindPercent}% (avg ${windImpact.headwind} km/h)`,
    );
    lines.push(
      `  ▼ Tailwind: ${windImpact.distribution.tailwindPercent}% (avg ${windImpact.tailwind} km/h)`,
    );
    lines.push(
      `  ◀▶ Crosswind: ${windImpact.distribution.crosswindPercent}% (avg ${windImpact.crosswind} km/h)`,
    );

    return lines.join('\n');
  }
}
