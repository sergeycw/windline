export interface RoutePalette {
  routeColor: string
  routeWidth: number
  haloColor: string
  haloWidth: number
  startMarkerColor: string
  finishMarkerColor: string
  windArrowColor: string
  windArrowOutline: string
}

export const DEFAULT_PALETTE: RoutePalette = {
  routeColor: '#7C3AED',
  routeWidth: 4,
  haloColor: '#DDD6FE',
  haloWidth: 8,
  startMarkerColor: '#22C55E',
  finishMarkerColor: '#EF4444',
  windArrowColor: '#DC2626',
  windArrowOutline: '#FFFFFF',
}

export const SUBTLE_PALETTE: RoutePalette = {
  routeColor: '#6D28D9',
  routeWidth: 3,
  haloColor: '#EDE9FE',
  haloWidth: 6,
  startMarkerColor: '#16A34A',
  finishMarkerColor: '#DC2626',
  windArrowColor: '#B91C1C',
  windArrowOutline: '#FFFFFF',
}

export const VIBRANT_PALETTE: RoutePalette = {
  routeColor: '#8B5CF6',
  routeWidth: 5,
  haloColor: '#C4B5FD',
  haloWidth: 10,
  startMarkerColor: '#10B981',
  finishMarkerColor: '#F43F5E',
  windArrowColor: '#EF4444',
  windArrowOutline: '#FFFFFF',
}

export type PaletteType = 'default' | 'subtle' | 'vibrant'

export function getPalette(type: PaletteType): RoutePalette {
  switch (type) {
    case 'subtle':
      return SUBTLE_PALETTE
    case 'vibrant':
      return VIBRANT_PALETTE
    default:
      return DEFAULT_PALETTE
  }
}
