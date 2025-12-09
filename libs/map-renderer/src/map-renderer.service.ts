import { Inject } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import StaticMaps from 'staticmaps'
import sharp from 'sharp'
import polyline from '@mapbox/polyline'

import type {
  RenderMapInput,
  RenderMapOptions,
  RenderMapResult,
  RouteRenderData,
  WindMarkerData,
} from './map-renderer.types'
import { createLegendCardSvg, getLegendCardHeight, SHADOW_MARGIN } from './legend-builder'
import { TILE_PROVIDER, type TileProvider } from './providers'
import { getPalette, type RoutePalette, type PaletteType } from './palette'
import type { GeoBounds } from './card-position'

const DEFAULT_WIDTH = 1080
const DEFAULT_HEIGHT = 1350
const PADDING_PERCENT = 0.08
const LEGEND_OFFSET = 0

const MARKER_RADIUS = 10
const ARROW_LENGTH_PERCENT = 0.08
const HEAD_LENGTH_RATIO = 0.375
const HEAD_WIDTH_RATIO = 0.5
const NECK_WIDTH_RATIO = 0.2

const MIN_ARROW_SCALE = 0.6
const MAX_ARROW_SCALE = 1.4
const WIND_SPEED_MIN_THRESHOLD = 5
const WIND_SPEED_MAX_THRESHOLD = 30

interface ArrowSizes {
  length: number
  headLength: number
  headWidth: number
  neckWidth: number
}

export class MapRendererService {
  private readonly palette: RoutePalette

  constructor(
    @Inject(TILE_PROVIDER)
    private readonly tileProvider: TileProvider,
    private readonly configService: ConfigService,
  ) {
    const paletteType = this.configService.get<PaletteType>('mapRenderer.palette', 'default')
    this.palette = getPalette(paletteType)
  }

  async renderMap(input: RenderMapInput, options: RenderMapOptions = {}): Promise<RenderMapResult> {
    const width = options.width ?? DEFAULT_WIDTH
    const height = options.height ?? DEFAULT_HEIGHT

    const tileConfig = this.tileProvider.getConfig()

    const paddingX = Math.round(width * PADDING_PERCENT)
    const paddingY = Math.round(height * PADDING_PERCENT)

    const map = new StaticMaps({
      width,
      height,
      paddingX,
      paddingY,
      tileUrl: tileConfig.tileUrl,
      tileRequestHeader: tileConfig.tileRequestHeader,
    })

    const geoCoords = this.decodeCoords(input.route)
    const coords = geoCoords.map((c) => [c.lon, c.lat] as [number, number])

    if (coords.length >= 2) {
      map.addLine({
        coords,
        color: this.palette.haloColor,
        width: this.palette.haloWidth,
      })

      map.addLine({
        coords,
        color: this.palette.routeColor,
        width: this.palette.routeWidth,
      })
    }

    const arrowSizes = this.calculateArrowSizes(geoCoords)
    this.addWindMarkers(map, input.windMarkers, arrowSizes)
    this.addStartFinishMarkers(map, geoCoords)

    await map.render()

    const mapBuffer = await map.image.buffer('image/png')

    const cardHeight = getLegendCardHeight(input.forecast)
    const legendSvg = createLegendCardSvg(input.route, input.forecast, width)

    const finalBuffer = await sharp(mapBuffer)
      .composite([{
        input: legendSvg,
        top: height - cardHeight,
        left: 0,
      }])
      .png({ compressionLevel: 6 })
      .toBuffer()

    return {
      buffer: finalBuffer,
      mimeType: 'image/png',
    }
  }

  private decodeCoords(routeData: RouteRenderData): Array<{ lat: number; lon: number }> {
    if (routeData.renderPolyline) {
      const decoded = polyline.decode(routeData.renderPolyline)
      return decoded.map(([lat, lon]) => ({ lat, lon }))
    }
    return routeData.points
  }

  private calculateBounds(points: Array<{ lat: number; lon: number }>): GeoBounds {
    if (points.length === 0) {
      return { minLat: 0, maxLat: 0, minLon: 0, maxLon: 0 }
    }

    let minLat = Infinity,
      maxLat = -Infinity
    let minLon = Infinity,
      maxLon = -Infinity

    for (const p of points) {
      if (p.lat < minLat) minLat = p.lat
      if (p.lat > maxLat) maxLat = p.lat
      if (p.lon < minLon) minLon = p.lon
      if (p.lon > maxLon) maxLon = p.lon
    }

    return { minLat, maxLat, minLon, maxLon }
  }

  private calculateArrowSizes(points: Array<{ lat: number; lon: number }>): ArrowSizes {
    if (points.length < 2) {
      return { length: 400, headLength: 150, headWidth: 200, neckWidth: 80 }
    }

    let minLat = Infinity, maxLat = -Infinity
    let minLon = Infinity, maxLon = -Infinity

    for (const p of points) {
      if (p.lat < minLat) minLat = p.lat
      if (p.lat > maxLat) maxLat = p.lat
      if (p.lon < minLon) minLon = p.lon
      if (p.lon > maxLon) maxLon = p.lon
    }

    const latDiff = maxLat - minLat
    const lonDiff = maxLon - minLon
    const avgLat = (minLat + maxLat) / 2
    const lonScale = Math.cos((avgLat * Math.PI) / 180)
    const diagonal = Math.sqrt(latDiff * latDiff + (lonDiff * lonScale) * (lonDiff * lonScale))
    const diagonalMeters = diagonal * 111000

    const length = diagonalMeters * ARROW_LENGTH_PERCENT
    return {
      length,
      headLength: length * HEAD_LENGTH_RATIO,
      headWidth: length * HEAD_WIDTH_RATIO,
      neckWidth: length * NECK_WIDTH_RATIO,
    }
  }

  private addWindMarkers(map: StaticMaps, markers: WindMarkerData[], baseSizes: ArrowSizes): void {
    for (const marker of markers) {
      const scale = this.calculateArrowScale(marker.windSpeed)
      const scaledSizes: ArrowSizes = {
        length: baseSizes.length * scale,
        headLength: baseSizes.headLength * scale,
        headWidth: baseSizes.headWidth * scale,
        neckWidth: baseSizes.neckWidth * scale,
      }

      const arrowCoords = this.calculateArrowPolygon(marker, scaledSizes)
      map.addPolygon({
        coords: arrowCoords,
        fill: this.palette.windArrowColor,
        color: this.palette.windArrowOutline,
        width: 2,
      })
    }
  }

  private calculateArrowScale(windSpeed: number): number {
    if (windSpeed <= WIND_SPEED_MIN_THRESHOLD) return MIN_ARROW_SCALE
    if (windSpeed >= WIND_SPEED_MAX_THRESHOLD) return MAX_ARROW_SCALE

    const ratio =
      (windSpeed - WIND_SPEED_MIN_THRESHOLD) /
      (WIND_SPEED_MAX_THRESHOLD - WIND_SPEED_MIN_THRESHOLD)
    return MIN_ARROW_SCALE + ratio * (MAX_ARROW_SCALE - MIN_ARROW_SCALE)
  }

  private calculateArrowPolygon(marker: WindMarkerData, sizes: ArrowSizes): Array<[number, number]> {
    const { lat, lon, windDirection } = marker
    const angle = windDirection
    const leftAngle = (angle + 90) % 360
    const rightAngle = (angle - 90 + 360) % 360

    const tip = { lat, lon }
    const neckEnd = this.offsetPoint(lat, lon, sizes.headLength, angle)
    const tail = this.offsetPoint(lat, lon, sizes.length, angle)

    const headLeft = this.offsetPoint(neckEnd.lat, neckEnd.lon, sizes.headWidth / 2, leftAngle)
    const headRight = this.offsetPoint(neckEnd.lat, neckEnd.lon, sizes.headWidth / 2, rightAngle)

    const neckLeft = this.offsetPoint(neckEnd.lat, neckEnd.lon, sizes.neckWidth / 2, leftAngle)
    const neckRight = this.offsetPoint(neckEnd.lat, neckEnd.lon, sizes.neckWidth / 2, rightAngle)

    const tailLeft = this.offsetPoint(tail.lat, tail.lon, sizes.neckWidth / 2, leftAngle)
    const tailRight = this.offsetPoint(tail.lat, tail.lon, sizes.neckWidth / 2, rightAngle)

    return [
      [tip.lon, tip.lat],
      [headLeft.lon, headLeft.lat],
      [neckLeft.lon, neckLeft.lat],
      [tailLeft.lon, tailLeft.lat],
      [tailRight.lon, tailRight.lat],
      [neckRight.lon, neckRight.lat],
      [headRight.lon, headRight.lat],
      [tip.lon, tip.lat],
    ]
  }

  private offsetPoint(
    lat: number,
    lon: number,
    distanceM: number,
    bearingDeg: number,
  ): { lat: number; lon: number } {
    const R = 6371000
    const bearingRad = (bearingDeg * Math.PI) / 180
    const latRad = (lat * Math.PI) / 180
    const lonRad = (lon * Math.PI) / 180
    const newLatRad = Math.asin(
      Math.sin(latRad) * Math.cos(distanceM / R) +
        Math.cos(latRad) * Math.sin(distanceM / R) * Math.cos(bearingRad),
    )
    const newLonRad =
      lonRad +
      Math.atan2(
        Math.sin(bearingRad) * Math.sin(distanceM / R) * Math.cos(latRad),
        Math.cos(distanceM / R) - Math.sin(latRad) * Math.sin(newLatRad),
      )

    return {
      lat: (newLatRad * 180) / Math.PI,
      lon: (newLonRad * 180) / Math.PI,
    }
  }

  private addStartFinishMarkers(
    map: StaticMaps,
    points: Array<{ lat: number; lon: number }>,
  ): void {
    if (points.length === 0) return

    const startPoint = points[0]
    const finishPoint = points[points.length - 1]

    map.addCircle({
      coord: [startPoint.lon, startPoint.lat],
      radius: MARKER_RADIUS,
      fill: this.palette.startMarkerColor,
      width: 2,
      color: '#FFFFFF',
    })

    const isSamePoint =
      Math.abs(startPoint.lat - finishPoint.lat) < 0.0001 &&
      Math.abs(startPoint.lon - finishPoint.lon) < 0.0001

    if (!isSamePoint) {
      map.addCircle({
        coord: [finishPoint.lon, finishPoint.lat],
        radius: MARKER_RADIUS,
        fill: this.palette.finishMarkerColor,
        width: 2,
        color: '#FFFFFF',
      })
    }
  }
}
