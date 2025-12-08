import { Injectable, Inject, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Repository } from 'typeorm';
import type { WeatherProvider, ForecastResponse, WindImpact, HourlyForecast, Coordinates } from '@windline/weather';
import {
  WEATHER_PROVIDER,
  ForecastRequest as WeatherForecastRequest,
  sampleRouteForWeather,
  calculateWindImpact,
} from '@windline/weather';
import type { RoutePoint } from '@windline/gpx';
import { Route, ForecastRequest, ForecastSummary } from '@windline/entities';
import { sha256, CACHE_TTL_MS } from '@windline/common';
import { MAP_RENDERER, type MapRendererService, type RenderMapResult, type WindMarkerData } from '@windline/map-renderer';
import { QUEUE_WEATHER_FETCH } from '@windline/queue-jobs';
import { ForecastRequestDto } from './dto/forecast-request.dto';

export interface ProcessForecastResult {
  forecastRequest: ForecastRequest;
  route: Route;
  cached: boolean;
}

export interface EnqueueForecastResult {
  requestId: string;
  status: 'pending' | 'cached';
  cached: boolean;
}

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);

  constructor(
    @Inject(WEATHER_PROVIDER)
    private readonly weatherProvider: WeatherProvider,
    @Inject(MAP_RENDERER)
    private readonly mapRenderer: MapRendererService,
    @InjectRepository(Route)
    private readonly routeRepository: Repository<Route>,
    @InjectRepository(ForecastRequest)
    private readonly forecastRequestRepository: Repository<ForecastRequest>,
    @InjectQueue(QUEUE_WEATHER_FETCH)
    private readonly weatherFetchQueue: Queue,
  ) {}

  async getRouteById(routeId: string): Promise<Route | null> {
    return this.routeRepository.findOne({ where: { id: routeId } });
  }

  async processForecastRequest(dto: ForecastRequestDto, route: Route): Promise<ProcessForecastResult> {
    const requestHash = this.createRequestHash(dto);

    const cached = await this.findCachedForecast(requestHash);
    if (cached) {
      this.logger.debug(`Cache hit for request ${requestHash}`);
      return { forecastRequest: cached, route, cached: true };
    }

    this.logger.debug(`Cache miss, fetching forecast for request ${requestHash}`);
    const forecastRequest = await this.createOrUpdateRequest(dto, route, requestHash);

    try {
      const forecastResponse = await this.getForecastForRoute(
        route.points,
        new Date(dto.date),
        dto.startHour,
        dto.durationHours,
      );

      const summary = this.calculateSummary(forecastResponse.forecasts);
      const windImpact = this.calculateWindImpact(route.points, forecastResponse.forecasts);

      forecastRequest.status = 'completed';
      forecastRequest.summary = summary;
      forecastRequest.windImpact = windImpact;
      forecastRequest.fetchedAt = forecastResponse.fetchedAt;
      forecastRequest.error = null;

      await this.forecastRequestRepository.save(forecastRequest);
      this.logger.log(`Forecast completed for route ${route.name}`);

      return { forecastRequest, route, cached: false };
    } catch (error) {
      forecastRequest.status = 'failed';
      forecastRequest.error = error instanceof Error ? error.message : 'Unknown error';
      await this.forecastRequestRepository.save(forecastRequest);
      this.logger.error(`Forecast failed for route ${route.name}: ${forecastRequest.error}`);
      throw error;
    }
  }

  createRequestHash(dto: ForecastRequestDto): string {
    const data = `${dto.routeId}:${dto.date}:${dto.startHour}:${dto.durationHours}`;
    return sha256(data);
  }

  async findCachedForecast(requestHash: string): Promise<ForecastRequest | null> {
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

  async createOrUpdateRequest(
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

  calculateSummary(
    forecasts: Map<string, HourlyForecast[]>,
  ): ForecastSummary {
    if (forecasts.size === 0) {
      return {
        temperatureMin: 0,
        temperatureMax: 0,
        windSpeedMin: 0,
        windSpeedMax: 0,
        windGustsMax: 0,
        precipitationProbabilityMax: 0,
        precipitationTotal: 0,
      };
    }

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
    precipitationTotal = precipitationTotal / pointCount;

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

  async getForecastForRoute(
    routePoints: RoutePoint[],
    date: Date,
    startHour: number,
    durationHours: number,
  ): Promise<ForecastResponse> {
    const coordinates = sampleRouteForWeather(routePoints);

    const request: WeatherForecastRequest = {
      coordinates,
      date,
      startHour,
      durationHours,
    };

    return this.weatherProvider.fetchForecast(request);
  }

  calculateWindImpact(
    routePoints: RoutePoint[],
    forecasts: Map<string, HourlyForecast[]>,
  ): WindImpact {
    const forecastKeys = Array.from(forecasts.keys());
    const forecastCoords = forecastKeys.map((key) => {
      const [lat, lon] = key.split(',').map(Number);
      return { key, lat, lon };
    });

    const segments: { bearing: number; windDirection: number; windSpeed: number }[] = [];

    for (const point of routePoints) {
      if (point.bearing === undefined) continue;

      const nearest = this.findNearestForecast(point, forecastCoords);
      if (!nearest) continue;

      const hourlyForecasts = forecasts.get(nearest.key);
      if (!hourlyForecasts || hourlyForecasts.length === 0) continue;

      const avgWindSpeed =
        hourlyForecasts.reduce((sum, f) => sum + f.windSpeed, 0) / hourlyForecasts.length;
      const avgWindDirection =
        hourlyForecasts.reduce((sum, f) => sum + f.windDirection, 0) / hourlyForecasts.length;

      segments.push({
        bearing: point.bearing,
        windDirection: avgWindDirection,
        windSpeed: avgWindSpeed,
      });
    }

    return calculateWindImpact(segments);
  }

  private findNearestForecast(
    point: Coordinates,
    forecastCoords: { key: string; lat: number; lon: number }[],
  ): { key: string } | null {
    if (forecastCoords.length === 0) return null;

    let nearest = forecastCoords[0];
    let minDistance = this.squaredDistance(point, nearest);

    for (let i = 1; i < forecastCoords.length; i++) {
      const dist = this.squaredDistance(point, forecastCoords[i]);
      if (dist < minDistance) {
        minDistance = dist;
        nearest = forecastCoords[i];
      }
    }

    return nearest;
  }

  private squaredDistance(a: Coordinates, b: { lat: number; lon: number }): number {
    const dLat = a.lat - b.lat;
    const dLon = a.lon - b.lon;
    return dLat * dLat + dLon * dLon;
  }

  async renderForecastMap(route: Route, forecastRequest: ForecastRequest): Promise<RenderMapResult> {
    if (!forecastRequest.summary || !forecastRequest.windImpact) {
      throw new Error('Forecast data not available');
    }

    const windMarkers = this.prepareWindMarkers(route, forecastRequest);

    return this.mapRenderer.renderMap({
      route: {
        points: route.points,
        renderPolyline: route.renderPolyline ?? undefined,
        name: route.name,
        distance: route.distance,
      },
      forecast: {
        summary: forecastRequest.summary,
        windImpact: forecastRequest.windImpact,
        date: forecastRequest.date,
        startHour: forecastRequest.startHour,
      },
      windMarkers,
    });
  }

  private prepareWindMarkers(route: Route, forecastRequest: ForecastRequest): WindMarkerData[] {
    const maxMarkers = 8
    const avgWindDirection = this.calculateAverageWindDirection(forecastRequest)
    const avgWindSpeed =
      (forecastRequest.summary!.windSpeedMin + forecastRequest.summary!.windSpeedMax) / 2

    let pointsWithBearing: Array<{ lat: number; lon: number; bearing: number }>

    if (route.renderPolyline) {
      pointsWithBearing = this.samplePolylinePointsWithBearing(route.renderPolyline, maxMarkers)
    } else {
      pointsWithBearing = this.samplePointsArrayWithBearing(route.points, maxMarkers)
    }

    return pointsWithBearing.map((point) => ({
      lat: point.lat,
      lon: point.lon,
      windDirection: avgWindDirection,
      windSpeed: avgWindSpeed,
      bearing: point.bearing,
    }))
  }

  private samplePolylinePointsWithBearing(
    encoded: string,
    count: number,
  ): Array<{ lat: number; lon: number; bearing: number }> {
    const polyline = require('@mapbox/polyline')
    const decoded: [number, number][] = polyline.decode(encoded)
    const points = decoded.map(([lat, lon]) => ({ lat, lon }))

    return this.samplePointsArrayWithBearing(points, count)
  }

  private samplePointsArrayWithBearing(
    points: Array<{ lat: number; lon: number }>,
    count: number,
  ): Array<{ lat: number; lon: number; bearing: number }> {
    if (points.length < 2) {
      return points.map((p) => ({ ...p, bearing: 0 }))
    }

    const result: Array<{ lat: number; lon: number; bearing: number }> = []
    const step = (points.length - 1) / (count - 1)

    for (let i = 0; i < count; i++) {
      const index = Math.min(Math.round(i * step), points.length - 1)
      const point = points[index]
      const nextIndex = Math.min(index + 1, points.length - 1)
      const nextPoint = points[nextIndex]

      const bearing = index === nextIndex ? (result.length > 0 ? result[result.length - 1].bearing : 0) : this.calculateBearing(point, nextPoint)

      result.push({ lat: point.lat, lon: point.lon, bearing })
    }

    return result
  }

  private calculateBearing(
    from: { lat: number; lon: number },
    to: { lat: number; lon: number },
  ): number {
    const lat1 = (from.lat * Math.PI) / 180
    const lat2 = (to.lat * Math.PI) / 180
    const dLon = ((to.lon - from.lon) * Math.PI) / 180

    const y = Math.sin(dLon) * Math.cos(lat2)
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon)

    const bearing = (Math.atan2(y, x) * 180) / Math.PI
    return (bearing + 360) % 360
  }

  private calculateAverageWindDirection(forecastRequest: ForecastRequest): number {
    const impact = forecastRequest.windImpact!;
    const headPct = impact.distribution.headwindPercent;
    const tailPct = impact.distribution.tailwindPercent;

    if (headPct > tailPct) {
      return 180;
    } else if (tailPct > headPct) {
      return 0;
    }
    return 90;
  }

  async enqueueForecastRequest(dto: ForecastRequestDto, route: Route): Promise<EnqueueForecastResult> {
    const requestHash = this.createRequestHash(dto);

    const cached = await this.findCachedForecast(requestHash);
    if (cached) {
      this.logger.debug(`Cache hit for request ${requestHash}`);
      return { requestId: cached.id, status: 'cached', cached: true };
    }

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
        status: 'pending',
      });
      await this.forecastRequestRepository.save(forecastRequest);
    }

    await this.weatherFetchQueue.add('fetch', { requestId: forecastRequest.id }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    });

    this.logger.log(`Forecast request ${forecastRequest.id} enqueued`);
    return { requestId: forecastRequest.id, status: 'pending', cached: false };
  }

  async getForecastRequestById(requestId: string): Promise<ForecastRequest | null> {
    return this.forecastRequestRepository.findOne({
      where: { id: requestId },
      relations: ['route'],
    });
  }

  async executeWeatherFetch(requestId: string): Promise<void> {
    const forecastRequest = await this.forecastRequestRepository.findOne({
      where: { id: requestId },
      relations: ['route'],
    });

    if (!forecastRequest) {
      throw new Error(`Forecast request ${requestId} not found`);
    }

    const route = forecastRequest.route;

    forecastRequest.status = 'processing';
    await this.forecastRequestRepository.save(forecastRequest);

    try {
      const forecastResponse = await this.getForecastForRoute(
        route.points,
        new Date(forecastRequest.date),
        forecastRequest.startHour,
        forecastRequest.durationHours,
      );

      const summary = this.calculateSummary(forecastResponse.forecasts);
      const windImpact = this.calculateWindImpact(route.points, forecastResponse.forecasts);

      forecastRequest.summary = summary;
      forecastRequest.windImpact = windImpact;
      forecastRequest.fetchedAt = forecastResponse.fetchedAt;
      forecastRequest.error = null;

      await this.forecastRequestRepository.save(forecastRequest);
      this.logger.log(`Weather fetch completed for request ${requestId}`);
    } catch (error) {
      forecastRequest.status = 'failed';
      forecastRequest.error = error instanceof Error ? error.message : 'Unknown error';
      await this.forecastRequestRepository.save(forecastRequest);
      throw error;
    }
  }

  async executeImageRender(requestId: string): Promise<void> {
    const forecastRequest = await this.forecastRequestRepository.findOne({
      where: { id: requestId },
      relations: ['route'],
    });

    if (!forecastRequest) {
      throw new Error(`Forecast request ${requestId} not found`);
    }

    if (!forecastRequest.summary || !forecastRequest.windImpact) {
      throw new Error(`Forecast data not available for request ${requestId}`);
    }

    const route = forecastRequest.route;

    try {
      const result = await this.renderForecastMap(route, forecastRequest);

      forecastRequest.imageBuffer = result.buffer;
      forecastRequest.imageRenderedAt = new Date();
      forecastRequest.status = 'completed';
      forecastRequest.error = null;
      await this.forecastRequestRepository.save(forecastRequest);

      this.logger.log(`Image render completed for request ${requestId}`);
    } catch (error) {
      forecastRequest.status = 'failed';
      forecastRequest.error = error instanceof Error ? error.message : 'Image render failed';
      await this.forecastRequestRepository.save(forecastRequest);
      throw error;
    }
  }
}
