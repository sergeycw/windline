import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
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
