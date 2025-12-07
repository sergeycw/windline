import type { TileProvider, TileProviderConfig } from './tile-provider.interface'
import type { StadiaStyleType } from '../map-renderer.config'

const STADIA_STYLES: Record<StadiaStyleType, string> = {
  stamen_terrain: 'stamen_terrain',
  osm_bright: 'osm_bright',
  alidade_smooth: 'alidade_smooth',
  alidade_smooth_dark: 'alidade_smooth_dark',
}

export class StadiaTileProvider implements TileProvider {
  constructor(
    private readonly apiKey: string,
    private readonly style: StadiaStyleType,
  ) {}

  getConfig(): TileProviderConfig {
    const stylePath = STADIA_STYLES[this.style]
    return {
      tileUrl: `https://tiles.stadiamaps.com/tiles/${stylePath}/{z}/{x}/{y}.png?api_key=${this.apiKey}`,
    }
  }
}
