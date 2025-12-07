import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash } from 'crypto';
import { GPX_PARSER, TogeojsonParser, optimizePoints, createRenderPolyline } from '@windline/gpx';
import type { ParsedRoute, OptimizeOptions } from '@windline/gpx';
import { Route } from '@windline/entities';

export interface UploadResult {
  route: Route;
  isNew: boolean;
}

@Injectable()
export class GpxService {
  constructor(
    @Inject(GPX_PARSER)
    private readonly gpxParser: TogeojsonParser,
    @InjectRepository(Route)
    private readonly routeRepository: Repository<Route>,
  ) {}

  async upload(
    gpxContent: string,
    userId: number,
    fileName?: string,
    optimizeOptions?: OptimizeOptions,
  ): Promise<UploadResult> {
    const hash = this.calculateHash(gpxContent);

    const existing = await this.routeRepository.findOne({ where: { hash } });
    if (existing) {
      return { route: existing, isNew: false };
    }

    const parsed = this.gpxParser.parse(gpxContent);
    const name = parsed.name !== 'Unnamed Route' ? parsed.name : fileName || 'Unnamed Route';

    const renderPolyline = createRenderPolyline(parsed.points);
    const optimizedPoints = optimizePoints(parsed.points, optimizeOptions);

    const route = this.routeRepository.create({
      userId,
      name,
      hash,
      distance: parsed.distance,
      points: optimizedPoints,
      renderPolyline,
    });

    await this.routeRepository.save(route);
    return { route, isNew: true };
  }

  parse(gpxContent: string): ParsedRoute {
    return this.gpxParser.parse(gpxContent);
  }

  private calculateHash(content: string): string {
    return createHash('sha256').update(content).digest('hex');
  }
}
