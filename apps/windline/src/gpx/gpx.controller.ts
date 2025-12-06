import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { GpxService } from './gpx.service';

interface UploadGpxDto {
  gpxContent: string;
  userId: number;
  fileName?: string;
}

@Controller('gpx')
export class GpxController {
  constructor(private readonly gpxService: GpxService) {}

  @Post('upload')
  @HttpCode(HttpStatus.OK)
  async upload(@Body() dto: UploadGpxDto) {
    const result = await this.gpxService.upload(dto.gpxContent, dto.userId, dto.fileName);
    return {
      id: result.route.id,
      name: result.route.name,
      distance: result.route.distance,
      pointsCount: result.route.points.length,
      isNew: result.isNew,
    };
  }

  @Post('parse')
  @HttpCode(HttpStatus.OK)
  parse(@Body() dto: { gpxContent: string }) {
    const parsed = this.gpxService.parse(dto.gpxContent);
    return {
      name: parsed.name,
      distance: parsed.distance,
      pointsCount: parsed.points.length,
    };
  }
}
