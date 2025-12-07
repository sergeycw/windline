import { registerAs } from '@nestjs/config'

export type MapProviderType = 'osm' | 'stadia'
export type StadiaStyleType = 'stamen_terrain' | 'osm_bright' | 'alidade_smooth' | 'alidade_smooth_dark'

export interface MapRendererConfig {
  provider: MapProviderType
  stadiaApiKey: string | undefined
  stadiaStyle: StadiaStyleType
  imageWidth: number
  imageHeight: number
}

export const mapRendererConfig = registerAs('mapRenderer', (): MapRendererConfig => ({
  provider: (process.env.MAP_PROVIDER || 'osm') as MapProviderType,
  stadiaApiKey: process.env.STADIA_API_KEY,
  stadiaStyle: (process.env.STADIA_STYLE || 'stamen_terrain') as StadiaStyleType,
  imageWidth: parseInt(process.env.MAP_WIDTH || '800', 10),
  imageHeight: parseInt(process.env.MAP_HEIGHT || '600', 10),
}))
