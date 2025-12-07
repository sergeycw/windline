import { Module, type DynamicModule } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { MapRendererService } from './map-renderer.service'
import { MAP_RENDERER } from './map-renderer.types'
import { TILE_PROVIDER, OsmTileProvider, StadiaTileProvider } from './providers'
import type { MapProviderType, StadiaStyleType } from './map-renderer.config'

@Module({})
export class MapRendererModule {
  static register(): DynamicModule {
    return {
      module: MapRendererModule,
      providers: [
        {
          provide: TILE_PROVIDER,
          useFactory: (configService: ConfigService) => {
            const provider = configService.get<MapProviderType>('mapRenderer.provider', 'osm')

            if (provider === 'stadia') {
              const apiKey = configService.get<string>('mapRenderer.stadiaApiKey')
              const style = configService.get<StadiaStyleType>(
                'mapRenderer.stadiaStyle',
                'stamen_terrain',
              )

              if (!apiKey) {
                console.warn('STADIA_API_KEY not set, falling back to OSM')
                return new OsmTileProvider()
              }

              return new StadiaTileProvider(apiKey, style)
            }

            return new OsmTileProvider()
          },
          inject: [ConfigService],
        },
        {
          provide: MAP_RENDERER,
          useClass: MapRendererService,
        },
      ],
      exports: [MAP_RENDERER],
    }
  }
}
