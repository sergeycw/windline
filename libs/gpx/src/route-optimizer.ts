import { RoutePoint } from './gpx-parser.interface';
import { haversine, addBearingsToPoints } from './geo-utils';

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
  const rounded = sampled.map((p) => roundCoordinates(p, precision));
  return addBearingsToPoints(rounded);
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

