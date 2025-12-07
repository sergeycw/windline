import { Module, type DynamicModule } from '@nestjs/common';
import { MapRendererService } from './map-renderer.service';
import { MAP_RENDERER } from './map-renderer.types';

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
