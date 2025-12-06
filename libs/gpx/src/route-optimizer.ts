import { RoutePoint } from './gpx-parser.interface';

export interface OptimizeOptions {
  samplingDistanceMeters?: number;
  coordinatePrecision?: number;
}

const DEFAULT_SAMPLING_DISTANCE = 2000;
const DEFAULT_PRECISION = 5;

export function optimizePoints(
  points: RoutePoint[],
  options: OptimizeOptions = {},
): RoutePoint[] {
  const samplingDistance = options.samplingDistanceMeters ?? DEFAULT_SAMPLING_DISTANCE;
  const precision = options.coordinatePrecision ?? DEFAULT_PRECISION;

  const sampled = downsample(points, samplingDistance);
  return sampled.map((p) => roundCoordinates(p, precision));
}

function downsample(points: RoutePoint[], minDistanceMeters: number): RoutePoint[] {
  if (points.length === 0) return [];

  const result: RoutePoint[] = [points[0]];
  let lastPoint = points[0];
  let accumulatedDistance = 0;

  for (let i = 1; i < points.length; i++) {
    const distance = haversine(lastPoint, points[i]);
    accumulatedDistance += distance;

    if (accumulatedDistance >= minDistanceMeters) {
      result.push(points[i]);
      lastPoint = points[i];
      accumulatedDistance = 0;
    }
  }

  if (result[result.length - 1] !== points[points.length - 1]) {
    result.push(points[points.length - 1]);
  }

  return result;
}

function roundCoordinates(point: RoutePoint, precision: number): RoutePoint {
  const factor = 10 ** precision;
  const result: RoutePoint = {
    lat: Math.round(point.lat * factor) / factor,
    lon: Math.round(point.lon * factor) / factor,
  };

  if (point.ele !== undefined) {
    result.ele = Math.round(point.ele);
  }

  if (point.time !== undefined) {
    result.time = point.time;
  }

  return result;
}

function haversine(p1: RoutePoint, p2: RoutePoint): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(p2.lat - p1.lat);
  const dLon = toRad(p2.lon - p1.lon);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(p1.lat)) * Math.cos(toRad(p2.lat)) * Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
