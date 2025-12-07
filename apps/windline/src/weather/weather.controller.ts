import {
  Controller,
  Post,
  Get,
  Body,
  Param,
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
  @HttpCode(HttpStatus.ACCEPTED)
  async createForecast(@Body() dto: ForecastRequestDto) {
    const route = await this.weatherService.getRouteById(dto.routeId);

    if (!route) {
      throw new NotFoundException('Route not found');
    }

    const result = await this.weatherService.enqueueForecastRequest(dto, route);

    return {
      requestId: result.requestId,
      status: result.status,
      cached: result.cached,
    };
  }

  @Get('forecast/:id')
  @HttpCode(HttpStatus.OK)
  async getForecastStatus(@Param('id') id: string) {
    const forecastRequest = await this.weatherService.getForecastRequestById(id);

    if (!forecastRequest) {
      throw new NotFoundException('Forecast request not found');
    }

    return this.formatStatusResponse(forecastRequest);
  }

  @Get('forecast/:id/image')
  @HttpCode(HttpStatus.OK)
  @Header('Content-Type', 'image/png')
  async getForecastImage(@Param('id') id: string, @Res() res: Response) {
    const forecastRequest = await this.weatherService.getForecastRequestById(id);

    if (!forecastRequest) {
      throw new NotFoundException('Forecast request not found');
    }

    if (!forecastRequest.imageBuffer) {
      throw new NotFoundException('Image not ready');
    }

    res.set({
      'Content-Type': 'image/png',
      'Content-Length': forecastRequest.imageBuffer.length,
    });
    res.send(forecastRequest.imageBuffer);
  }

  private formatStatusResponse(forecastRequest: ForecastRequest) {
    return {
      requestId: forecastRequest.id,
      routeId: forecastRequest.routeId,
      date: forecastRequest.date,
      startHour: forecastRequest.startHour,
      durationHours: forecastRequest.durationHours,
      status: forecastRequest.status,
      summary: forecastRequest.summary,
      windImpact: forecastRequest.windImpact,
      hasImage: !!forecastRequest.imageBuffer,
      error: forecastRequest.error,
      fetchedAt: forecastRequest.fetchedAt,
    };
  }
}
