import { Module, type DynamicModule } from '@nestjs/common';
import { MapRendererService } from './map-renderer.service.js';
import { MAP_RENDERER } from './map-renderer.types.js';

@Module({})
export class MapRendererModule {
  static register(): DynamicModule {
    return {
      module: MapRendererModule,
      providers: [
        {
          provide: MAP_RENDERER,
          useClass: MapRendererService,
        },
      ],
      exports: [MAP_RENDERER],
    };
  }
}
