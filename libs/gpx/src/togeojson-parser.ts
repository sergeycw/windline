import { DOMParser } from '@xmldom/xmldom';
import * as toGeoJSON from '@tmcw/togeojson';
import { GpxParser, ParsedRoute, RoutePoint } from './gpx-parser.interface';
import { haversine } from './geo-utils';

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
      total += haversine(points[i - 1], points[i]);
    }
    return Math.round(total);
  }
}
