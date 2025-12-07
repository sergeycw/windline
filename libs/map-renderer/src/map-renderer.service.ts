import StaticMaps from 'staticmaps';
import sharp from 'sharp';
import type { RenderMapInput, RenderMapOptions, RenderMapResult, WindMarkerData } from './map-renderer.types.js';
import { createLegendSvg, getLegendHeight } from './legend-builder.js';

const DEFAULT_WIDTH = 800;
const DEFAULT_MAP_HEIGHT = 500;

const ROUTE_COLOR = '#3B82F6';
const ROUTE_WIDTH = 4;

const START_MARKER_COLOR = '#22C55E';
const FINISH_MARKER_COLOR = '#EF4444';
const MARKER_RADIUS = 8;

const WIND_ARROW_COLOR = '#DC2626';
const WIND_ARROW_SIZE = 24;

export class MapRendererService {
  async renderMap(input: RenderMapInput, options: RenderMapOptions = {}): Promise<RenderMapResult> {
    const width = options.width ?? DEFAULT_WIDTH;
    const mapHeight = options.height ?? DEFAULT_MAP_HEIGHT;
    const legendHeight = getLegendHeight();

    const map = new StaticMaps({
      width,
      height: mapHeight,
      paddingX: 30,
      paddingY: 30,
      tileUrl: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      tileRequestHeader: {
        'User-Agent': 'Windline-Bot/1.0 (weather forecast for cycling routes)',
      },
    });

    this.addRouteLine(map, input.route.points);
    this.addWindMarkers(map, input.windMarkers);
    this.addStartFinishMarkers(map, input.route.points);

    await map.render();

    const mapBuffer = await map.image.buffer('image/png');

    const legendSvg = createLegendSvg(input.route, input.forecast, { width });

    const finalBuffer = await sharp(mapBuffer)
      .extend({
        bottom: legendHeight,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      })
      .composite([{ input: legendSvg, top: mapHeight, left: 0 }])
      .png({ compressionLevel: 6 })
      .toBuffer();

    return {
      buffer: finalBuffer,
      mimeType: 'image/png',
    };
  }

  private addRouteLine(map: StaticMaps, points: Array<{ lat: number; lon: number }>): void {
    if (points.length < 2) return;

    const coords = points.map((p) => [p.lon, p.lat]);

    map.addLine({
      coords,
      color: ROUTE_COLOR,
      width: ROUTE_WIDTH,
    });
  }

  private addWindMarkers(map: StaticMaps, markers: WindMarkerData[]): void {
    for (const marker of markers) {
      const arrow = this.getWindArrowChar(marker.windDirection);

      map.addText({
        coord: [marker.lon, marker.lat],
        text: arrow,
        size: WIND_ARROW_SIZE,
        fill: '#FF0000',
        color: '#990000',
        width: 1,
        anchor: 'middle',
      });
    }
  }

  private getWindArrowChar(windDirection: number): string {
    const arrows = ['↓', '↙', '←', '↖', '↑', '↗', '→', '↘'];
    const displayDirection = (windDirection + 180) % 360;
    const index = Math.round(displayDirection / 45) % 8;
    return arrows[index];
  }

  private addStartFinishMarkers(
    map: StaticMaps,
    points: Array<{ lat: number; lon: number }>,
  ): void {
    if (points.length === 0) return;

    const startPoint = points[0];
    const finishPoint = points[points.length - 1];

    map.addCircle({
      coord: [startPoint.lon, startPoint.lat],
      radius: MARKER_RADIUS,
      fill: START_MARKER_COLOR,
      width: 2,
      color: '#FFFFFF',
    });

    const isSamePoint =
      Math.abs(startPoint.lat - finishPoint.lat) < 0.0001 &&
      Math.abs(startPoint.lon - finishPoint.lon) < 0.0001;

    if (!isSamePoint) {
      map.addCircle({
        coord: [finishPoint.lon, finishPoint.lat],
        radius: MARKER_RADIUS,
        fill: FINISH_MARKER_COLOR,
        width: 2,
        color: '#FFFFFF',
      });
    }
  }
}
