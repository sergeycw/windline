import type { TileProvider, TileProviderConfig } from './tile-provider.interface'

export class OsmTileProvider implements TileProvider {
  getConfig(): TileProviderConfig {
    return {
      tileUrl: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      tileRequestHeader: {
        'User-Agent': 'Windline-Bot/1.0 (weather forecast for cycling routes)',
      },
    }
  }
}
