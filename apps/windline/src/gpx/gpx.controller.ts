import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { GpxService } from './gpx.service';
import { UploadGpxDto } from './dto/upload-gpx.dto';
import { ParseGpxDto } from './dto/parse-gpx.dto';

@Controller('gpx')
export class GpxController {
  constructor(private readonly gpxService: GpxService) {}

  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
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
  parse(@Body() dto: ParseGpxDto) {
    const parsed = this.gpxService.parse(dto.gpxContent);
    return {
      name: parsed.name,
      distance: parsed.distance,
      pointsCount: parsed.points.length,
    };
  }
}
