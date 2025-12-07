import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash } from 'crypto';
import { Route, ForecastRequest, ForecastSummary } from '@windline/entities';
import { WeatherService } from './weather.service';
import { ForecastRequestDto } from './dto/forecast-request.dto';

const CACHE_TTL_MS = 60 * 60 * 1000;

@Controller('weather')
export class WeatherController {
  constructor(
    private readonly weatherService: WeatherService,
    @InjectRepository(Route)
    private readonly routeRepository: Repository<Route>,
    @InjectRepository(ForecastRequest)
    private readonly forecastRequestRepository: Repository<ForecastRequest>,
  ) {}

  @Post('forecast')
  @HttpCode(HttpStatus.OK)
  async getForecast(@Body() dto: ForecastRequestDto) {
    const route = await this.routeRepository.findOne({
      where: { id: dto.routeId },
    });

    if (!route) {
      throw new NotFoundException('Route not found');
    }

    const requestHash = this.createRequestHash(dto);

    const cached = await this.findCachedForecast(requestHash);
    if (cached) {
      return this.formatResponse(cached, route);
    }

    const forecastRequest = await this.createOrUpdateRequest(dto, route, requestHash);

    try {
      const forecastResponse = await this.weatherService.getForecastForRoute(
        route.points,
        new Date(dto.date),
        dto.startHour,
        dto.durationHours,
      );

      const summary = this.calculateSummary(forecastResponse.forecasts);
      const windImpact = this.weatherService.calculateWindImpact(
        route.points,
        forecastResponse.forecasts,
      );

      forecastRequest.status = 'completed';
      forecastRequest.summary = summary;
      forecastRequest.windImpact = windImpact;
      forecastRequest.fetchedAt = forecastResponse.fetchedAt;
      forecastRequest.error = null;

      await this.forecastRequestRepository.save(forecastRequest);

      return this.formatResponse(forecastRequest, route);
    } catch (error) {
      forecastRequest.status = 'failed';
      forecastRequest.error = error instanceof Error ? error.message : 'Unknown error';
      await this.forecastRequestRepository.save(forecastRequest);
      throw error;
    }
  }

  private createRequestHash(dto: ForecastRequestDto): string {
    const data = `${dto.routeId}:${dto.date}:${dto.startHour}:${dto.durationHours}`;
    return createHash('sha256').update(data).digest('hex');
  }

  private async findCachedForecast(requestHash: string): Promise<ForecastRequest | null> {
    const cached = await this.forecastRequestRepository.findOne({
      where: { requestHash, status: 'completed' },
    });

    if (!cached || !cached.fetchedAt) {
      return null;
    }

    const age = Date.now() - cached.fetchedAt.getTime();
    if (age > CACHE_TTL_MS) {
      return null;
    }

    return cached;
  }

  private async createOrUpdateRequest(
    dto: ForecastRequestDto,
    route: Route,
    requestHash: string,
  ): Promise<ForecastRequest> {
    let forecastRequest = await this.forecastRequestRepository.findOne({
      where: { requestHash },
    });

    if (!forecastRequest) {
      forecastRequest = this.forecastRequestRepository.create({
        routeId: dto.routeId,
        userId: route.userId,
        requestHash,
        date: dto.date,
        startHour: dto.startHour,
        durationHours: dto.durationHours,
        status: 'processing',
      });
    } else {
      forecastRequest.status = 'processing';
    }

    return this.forecastRequestRepository.save(forecastRequest);
  }

  private formatResponse(forecastRequest: ForecastRequest, route: Route) {
    return {
      requestId: forecastRequest.id,
      routeId: route.id,
      routeName: route.name,
      date: forecastRequest.date,
      startHour: forecastRequest.startHour,
      durationHours: forecastRequest.durationHours,
      summary: forecastRequest.summary,
      windImpact: forecastRequest.windImpact,
      fetchedAt: forecastRequest.fetchedAt,
      cached: forecastRequest.status === 'completed' && forecastRequest.fetchedAt !== null,
    };
  }

  private calculateSummary(
    forecasts: Map<string, { temperature: number; windSpeed: number; windGusts: number; precipitationProbability: number; precipitation: number }[]>,
  ): ForecastSummary {
    let temperatureMin = Infinity;
    let temperatureMax = -Infinity;
    let windSpeedMin = Infinity;
    let windSpeedMax = -Infinity;
    let windGustsMax = -Infinity;
    let precipitationProbabilityMax = -Infinity;
    let precipitationTotal = 0;

    for (const hourlyForecasts of forecasts.values()) {
      for (const forecast of hourlyForecasts) {
        temperatureMin = Math.min(temperatureMin, forecast.temperature);
        temperatureMax = Math.max(temperatureMax, forecast.temperature);
        windSpeedMin = Math.min(windSpeedMin, forecast.windSpeed);
        windSpeedMax = Math.max(windSpeedMax, forecast.windSpeed);
        windGustsMax = Math.max(windGustsMax, forecast.windGusts);
        precipitationProbabilityMax = Math.max(precipitationProbabilityMax, forecast.precipitationProbability);
        precipitationTotal += forecast.precipitation;
      }
    }

    const pointCount = forecasts.size;
    if (pointCount > 0) {
      precipitationTotal = precipitationTotal / pointCount;
    }

    return {
      temperatureMin: Math.round(temperatureMin),
      temperatureMax: Math.round(temperatureMax),
      windSpeedMin: Math.round(windSpeedMin),
      windSpeedMax: Math.round(windSpeedMax),
      windGustsMax: Math.round(windGustsMax),
      precipitationProbabilityMax: Math.round(precipitationProbabilityMax),
      precipitationTotal: Math.round(precipitationTotal * 10) / 10,
    };
  }
}
