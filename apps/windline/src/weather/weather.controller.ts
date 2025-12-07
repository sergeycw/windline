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
import { Route } from '@windline/entities';
import { WeatherService } from './weather.service';
import { ForecastRequestDto } from './dto/forecast-request.dto';

interface ForecastSummary {
  temperatureMin: number;
  temperatureMax: number;
  windSpeedMin: number;
  windSpeedMax: number;
  windGustsMax: number;
  precipitationProbabilityMax: number;
  precipitationTotal: number;
}

@Controller('weather')
export class WeatherController {
  constructor(
    private readonly weatherService: WeatherService,
    @InjectRepository(Route)
    private readonly routeRepository: Repository<Route>,
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

    return {
      routeId: route.id,
      routeName: route.name,
      date: dto.date,
      startHour: dto.startHour,
      durationHours: dto.durationHours,
      summary,
      windImpact,
      fetchedAt: forecastResponse.fetchedAt,
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
