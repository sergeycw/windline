import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Res,
  Header,
} from '@nestjs/common';
import type { Response } from 'express';
import { ForecastRequest, Route } from '@windline/entities';
import { WeatherService } from './weather.service';
import { ForecastRequestDto } from './dto/forecast-request.dto';

@Controller('weather')
export class WeatherController {
  constructor(private readonly weatherService: WeatherService) {}

  @Post('forecast')
  @HttpCode(HttpStatus.OK)
  async getForecast(@Body() dto: ForecastRequestDto) {
    const route = await this.weatherService.getRouteById(dto.routeId);

    if (!route) {
      throw new NotFoundException('Route not found');
    }

    const result = await this.weatherService.processForecastRequest(dto, route);

    return this.formatResponse(result.forecastRequest, result.route, result.cached);
  }

  @Post('forecast/image')
  @HttpCode(HttpStatus.OK)
  @Header('Content-Type', 'image/png')
  async getForecastImage(@Body() dto: ForecastRequestDto, @Res() res: Response) {
    const route = await this.weatherService.getRouteById(dto.routeId);

    if (!route) {
      throw new NotFoundException('Route not found');
    }

    const result = await this.weatherService.processForecastRequest(dto, route);
    const imageResult = await this.weatherService.renderForecastMap(route, result.forecastRequest);

    res.set({
      'Content-Type': imageResult.mimeType,
      'Content-Length': imageResult.buffer.length,
    });
    res.send(imageResult.buffer);
  }

  private formatResponse(forecastRequest: ForecastRequest, route: Route, cached: boolean) {
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
      cached,
    };
  }
}
