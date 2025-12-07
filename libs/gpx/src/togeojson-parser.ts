import { DOMParser } from '@xmldom/xmldom';
import * as toGeoJSON from '@tmcw/togeojson';
import { GpxParser, ParsedRoute, RoutePoint } from './gpx-parser.interface';
import { haversine } from './geo-utils';

export class GpxParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GpxParseError';
  }
}

export class TogeojsonParser implements GpxParser {
  parse(gpxContent: string): ParsedRoute {
    if (!gpxContent || typeof gpxContent !== 'string') {
      throw new GpxParseError('GPX content is empty or invalid');
    }

    let doc: Document;
    try {
      doc = new DOMParser().parseFromString(gpxContent, 'text/xml');
    } catch {
      throw new GpxParseError('Failed to parse GPX: invalid XML');
    }

    const parseErrors = doc.getElementsByTagName('parsererror');
    if (parseErrors.length > 0) {
      throw new GpxParseError('Failed to parse GPX: invalid XML structure');
    }

    let geoJson: ReturnType<typeof toGeoJSON.gpx>;
    try {
      geoJson = toGeoJSON.gpx(doc);
    } catch {
      throw new GpxParseError('Failed to parse GPX: invalid GPX format');
    }

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

    if (points.length === 0) {
      throw new GpxParseError('GPX file contains no route points');
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
