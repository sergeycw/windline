export interface TileProviderConfig {
  tileUrl: string
  tileRequestHeader?: Record<string, string>
}

export interface TileProvider {
  getConfig(): TileProviderConfig
}

export const TILE_PROVIDER = Symbol('TILE_PROVIDER')
