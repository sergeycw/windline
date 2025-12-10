import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FETCH_TIMEOUT_MS, formatDateISO } from '@windline/common';
import type { ForecastSummary, WindImpactData } from '@windline/entities';
import { createApiHeaders } from './api-headers';

interface CreateForecastResponse {
  requestId: string;
  status: 'pending' | 'cached';
  cached: boolean;
}

interface ForecastStatusResponse {
  requestId: string;
  routeId: string;
  date: string;
  startHour: number;
  durationHours: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  summary?: ForecastSummary;
  windImpact?: WindImpactData;
  hasImage?: boolean;
  error?: string;
  fetchedAt?: string;
}

interface ForecastResult {
  success: boolean;
  data?: ForecastStatusResponse;
  error?: string;
}

interface ForecastImageResult {
  success: boolean;
  buffer?: Buffer;
  error?: string;
}

interface PollOptions {
  interval: number;
  timeout: number;
}

const DEFAULT_POLL_OPTIONS: PollOptions = {
  interval: 2000,
  timeout: 30000,
};

@Injectable()
export class WeatherApiService {
  private readonly logger = new Logger(WeatherApiService.name);
  private readonly apiUrl: string;
  private readonly apiSecretKey: string | undefined;

  constructor(private readonly configService: ConfigService) {
    this.apiUrl = this.configService.getOrThrow<string>('API_URL');
    this.apiSecretKey = this.configService.get<string>('API_SECRET_KEY');
  }

  private getHeaders(contentType?: string): Record<string, string> {
    return createApiHeaders(this.apiSecretKey, contentType);
  }

  async createForecastRequest(
    routeId: string,
    date: Date,
    startHour: number,
    durationHours: number,
  ): Promise<{ success: boolean; requestId?: string; cached?: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.apiUrl}/weather/forecast`, {
        method: 'POST',
        headers: this.getHeaders('application/json'),
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
        return { success: false, error: 'Failed to create forecast request' };
      }

      const data: CreateForecastResponse = await response.json();
      return { success: true, requestId: data.requestId, cached: data.cached };
    } catch (error) {
      this.logger.error('Create forecast request failed', error instanceof Error ? error.stack : error);

      if (error instanceof Error && error.name === 'TimeoutError') {
        return { success: false, error: 'Request timed out' };
      }

      return { success: false, error: 'Failed to create forecast request' };
    }
  }

  async getForecastStatus(requestId: string): Promise<ForecastResult> {
    try {
      const response = await fetch(`${this.apiUrl}/weather/forecast/${requestId}`, {
        method: 'GET',
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });

      if (!response.ok) {
        this.logger.warn(`Weather status API error: ${response.status}`);
        return { success: false, error: 'Failed to get forecast status' };
      }

      const data: ForecastStatusResponse = await response.json();
      return { success: true, data };
    } catch (error) {
      this.logger.error('Get forecast status failed', error instanceof Error ? error.stack : error);
      return { success: false, error: 'Failed to get forecast status' };
    }
  }

  async pollForResult(
    requestId: string,
    options: PollOptions = DEFAULT_POLL_OPTIONS,
  ): Promise<ForecastResult> {
    const startTime = Date.now();

    while (Date.now() - startTime < options.timeout) {
      const result = await this.getForecastStatus(requestId);

      if (!result.success) {
        return result;
      }

      const status = result.data!.status;

      if (status === 'completed') {
        return result;
      }

      if (status === 'failed') {
        return { success: false, error: result.data!.error || 'Forecast processing failed' };
      }

      await this.sleep(options.interval);
    }

    return { success: false, error: 'Forecast processing timed out' };
  }

  async getForecastWithPolling(
    routeId: string,
    date: Date,
    startHour: number,
    durationHours: number,
    pollOptions: PollOptions = DEFAULT_POLL_OPTIONS,
  ): Promise<ForecastResult> {
    const createResult = await this.createForecastRequest(routeId, date, startHour, durationHours);

    if (!createResult.success) {
      return { success: false, error: createResult.error };
    }

    const requestId = createResult.requestId!;

    if (createResult.cached) {
      return this.getForecastStatus(requestId);
    }

    return this.pollForResult(requestId, pollOptions);
  }

  async getForecastImage(requestId: string): Promise<ForecastImageResult> {
    try {
      const response = await fetch(`${this.apiUrl}/weather/forecast/${requestId}/image`, {
        method: 'GET',
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });

      if (!response.ok) {
        this.logger.warn(`Weather image API error: ${response.status}`);
        return { success: false, error: 'Failed to get forecast image' };
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      return { success: true, buffer };
    } catch (error) {
      this.logger.error('Get forecast image failed', error instanceof Error ? error.stack : error);
      return { success: false, error: 'Failed to get forecast image' };
    }
  }

  formatForecast(forecast: ForecastStatusResponse): string {
    const { summary, windImpact } = forecast;

    if (!summary || !windImpact) {
      return '⚠️ Forecast data not available';
    }

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

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
