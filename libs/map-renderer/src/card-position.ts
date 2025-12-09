export type CardCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

export interface CardPosition {
  corner: CardCorner
  x: number
  y: number
}

export interface GeoBounds {
  minLat: number
  maxLat: number
  minLon: number
  maxLon: number
}

interface CornerDensity {
  corner: CardCorner
  density: number
}

export function calculateOptimalCardPosition(
  routePoints: Array<{ lat: number; lon: number }>,
  bounds: GeoBounds,
  mapWidth: number,
  mapHeight: number,
  cardDimensions: { width: number; height: number },
  offset: number = 16,
): CardPosition {
  if (routePoints.length === 0) {
    return { corner: 'top-left', x: offset, y: offset }
  }

  const corners: CornerDensity[] = [
    { corner: 'top-left', density: 0 },
    { corner: 'top-right', density: 0 },
    { corner: 'bottom-left', density: 0 },
    { corner: 'bottom-right', density: 0 },
  ]

  const latRange = bounds.maxLat - bounds.minLat
  const lonRange = bounds.maxLon - bounds.minLon

  if (latRange === 0 || lonRange === 0) {
    return { corner: 'top-left', x: offset, y: offset }
  }

  for (const point of routePoints) {
    const normalizedX = (point.lon - bounds.minLon) / lonRange
    const normalizedY = (bounds.maxLat - point.lat) / latRange

    const isLeft = normalizedX < 0.5
    const isTop = normalizedY < 0.5

    if (isTop && isLeft) corners[0].density++
    else if (isTop && !isLeft) corners[1].density++
    else if (!isTop && isLeft) corners[2].density++
    else corners[3].density++
  }

  const optimal = corners.reduce((min, c) => (c.density < min.density ? c : min))

  return getCornerCoordinates(optimal.corner, cardDimensions, offset, mapWidth, mapHeight)
}

function getCornerCoordinates(
  corner: CardCorner,
  cardDimensions: { width: number; height: number },
  offset: number,
  mapWidth: number,
  mapHeight: number,
): CardPosition {
  switch (corner) {
    case 'top-left':
      return { corner, x: offset, y: offset }
    case 'top-right':
      return { corner, x: mapWidth - cardDimensions.width - offset, y: offset }
    case 'bottom-left':
      return { corner, x: offset, y: mapHeight - cardDimensions.height - offset }
    case 'bottom-right':
      return {
        corner,
        x: mapWidth - cardDimensions.width - offset,
        y: mapHeight - cardDimensions.height - offset,
      }
  }
}
