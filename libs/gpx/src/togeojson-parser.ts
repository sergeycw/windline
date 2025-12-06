import { DOMParser } from '@xmldom/xmldom';
import * as toGeoJSON from '@tmcw/togeojson';
import { GpxParser, ParsedRoute, RoutePoint } from './gpx-parser.interface';

export class TogeojsonParser implements GpxParser {
  parse(gpxContent: string): ParsedRoute {
    const doc = new DOMParser().parseFromString(gpxContent, 'text/xml');
    const geoJson = toGeoJSON.gpx(doc);

    const points: RoutePoint[] = [];
    let name = 'Unnamed Route';

    for (const feature of geoJson.features) {
      if (feature.properties?.name) {
        name = feature.properties.name;
      }

      if (feature.geometry.type === 'LineString') {
        const coords = feature.geometry.coordinates;
        const times = feature.properties?.coordinateProperties?.times;

        for (let i = 0; i < coords.length; i++) {
          const coord = coords[i];
          const point: RoutePoint = {
            lon: coord[0],
            lat: coord[1],
          };
          if (coord[2] !== undefined) {
            point.ele = coord[2];
          }
          if (times && times[i]) {
            point.time = new Date(times[i]);
          }
          points.push(point);
        }
      }
    }

    const distance = this.calculateDistance(points);

    return { name, points, distance };
  }

  private calculateDistance(points: RoutePoint[]): number {
    let total = 0;
    for (let i = 1; i < points.length; i++) {
      total += this.haversine(points[i - 1], points[i]);
    }
    return Math.round(total);
  }

  private haversine(p1: RoutePoint, p2: RoutePoint): number {
    const R = 6371000;
    const toRad = (deg: number) => (deg * Math.PI) / 180;

    const dLat = toRad(p2.lat - p1.lat);
    const dLon = toRad(p2.lon - p1.lon);

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(p1.lat)) * Math.cos(toRad(p2.lat)) * Math.sin(dLon / 2) ** 2;

    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}
