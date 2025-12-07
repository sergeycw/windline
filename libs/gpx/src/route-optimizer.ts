import { RoutePoint } from './gpx-parser.interface';
import { haversine, addBearingsToPoints } from './geo-utils';
import polyline from '@mapbox/polyline';

export interface OptimizeOptions {
  samplingDistanceMeters?: number;
  coordinatePrecision?: number;
}

const DEFAULT_SAMPLING_DISTANCE = 2000;
const DEFAULT_PRECISION = 5;

const DOUGLAS_PEUCKER_TOLERANCE = 7;
const MAX_RENDER_POINTS = 300;
const FALLBACK_DISTANCE = 500;

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

function perpendicularDistance(
  point: RoutePoint,
  lineStart: RoutePoint,
  lineEnd: RoutePoint,
): number {
  const latMid = (lineStart.lat + lineEnd.lat) / 2;
  const metersPerDegreeLat = 111320;
  const metersPerDegreeLon = metersPerDegreeLat * Math.cos((latMid * Math.PI) / 180);

  const x = point.lon * metersPerDegreeLon;
  const y = point.lat * metersPerDegreeLat;
  const x1 = lineStart.lon * metersPerDegreeLon;
  const y1 = lineStart.lat * metersPerDegreeLat;
  const x2 = lineEnd.lon * metersPerDegreeLon;
  const y2 = lineEnd.lat * metersPerDegreeLat;

  const dx = x2 - x1;
  const dy = y2 - y1;
  const lineLengthSq = dx * dx + dy * dy;

  if (lineLengthSq === 0) {
    return Math.sqrt((x - x1) ** 2 + (y - y1) ** 2);
  }

  const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / lineLengthSq));
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;

  return Math.sqrt((x - projX) ** 2 + (y - projY) ** 2);
}

function douglasPeucker(points: RoutePoint[], toleranceMeters: number): RoutePoint[] {
  if (points.length <= 2) return points;

  let maxDist = 0;
  let maxIndex = 0;

  for (let i = 1; i < points.length - 1; i++) {
    const dist = perpendicularDistance(points[i], points[0], points[points.length - 1]);
    if (dist > maxDist) {
      maxDist = dist;
      maxIndex = i;
    }
  }

  if (maxDist > toleranceMeters) {
    const left = douglasPeucker(points.slice(0, maxIndex + 1), toleranceMeters);
    const right = douglasPeucker(points.slice(maxIndex), toleranceMeters);
    return left.slice(0, -1).concat(right);
  }

  return [points[0], points[points.length - 1]];
}

export interface RenderPolylineOptions {
  tolerance?: number;
  maxPoints?: number;
}

export function createRenderPolyline(
  rawPoints: RoutePoint[],
  options: RenderPolylineOptions = {},
): string {
  if (rawPoints.length < 2) {
    return polyline.encode(rawPoints.map((p) => [p.lat, p.lon] as [number, number]));
  }

  const tolerance = options.tolerance ?? DOUGLAS_PEUCKER_TOLERANCE;
  const maxPoints = options.maxPoints ?? MAX_RENDER_POINTS;

  let simplified = douglasPeucker(rawPoints, tolerance);

  if (simplified.length > maxPoints) {
    simplified = downsample(rawPoints, FALLBACK_DISTANCE);
  }

  const coords = simplified.map((p) => [p.lat, p.lon] as [number, number]);
  return polyline.encode(coords);
}

