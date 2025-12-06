import {
  Controller,
  Get,
  Delete,
  Param,
  Query,
  NotFoundException,
} from '@nestjs/common';
import { RoutesService } from './routes.service';

@Controller('routes')
export class RoutesController {
  constructor(private readonly routesService: RoutesService) {}

  @Get(':id')
  async findById(@Param('id') id: string) {
    const route = await this.routesService.findById(id);
    if (!route) {
      throw new NotFoundException('Route not found');
    }
    return {
      id: route.id,
      name: route.name,
      distance: route.distance,
      pointsCount: route.points.length,
      createdAt: route.createdAt,
    };
  }

  @Get()
  async findByUser(@Query('userId') userId: string) {
    const routes = await this.routesService.findByUserId(Number(userId));
    return routes.map((route) => ({
      id: route.id,
      name: route.name,
      distance: route.distance,
      pointsCount: route.points.length,
      createdAt: route.createdAt,
    }));
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    const deleted = await this.routesService.delete(id);
    if (!deleted) {
      throw new NotFoundException('Route not found');
    }
    return { deleted: true };
  }
}
