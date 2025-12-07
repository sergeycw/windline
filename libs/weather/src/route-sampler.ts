import {
  Coordinates,
  coordsKey,
  WEATHER_SAMPLING_DISTANCE_METERS,
} from './weather.types';

interface PointLike {
  lat: number;
  lon: number;
}

const toRad = (deg: number): number => (deg * Math.PI) / 180;

function haversine(p1: PointLike, p2: PointLike): number {
  const R = 6371000;
  const dLat = toRad(p2.lat - p1.lat);
  const dLon = toRad(p2.lon - p1.lon);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(p1.lat)) * Math.cos(toRad(p2.lat)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Samples route points for weather API queries.
 *
 * Two-step process:
 * 1. Downsample by distance (default 10km) — reduces 100km route to ~11 points
 * 2. Deduplicate by coordsKey (0.01° grid) — merges nearby points
 *
 * Example: 100km straight route → 11 points → 11 API requests
 * Example: 100km loop route → 11 points → 8-10 API requests (some overlap)
 *
 * Always includes start and end points of the route.
 */
export function sampleRouteForWeather(
  points: PointLike[],
  samplingDistance: number = WEATHER_SAMPLING_DISTANCE_METERS,
): Coordinates[] {
  if (points.length === 0) return [];
  if (points.length === 1) {
    return [{ lat: points[0].lat, lon: points[0].lon }];
  }

  /**
   * Step 1: Downsample by distance.
   * Walk along route, pick point every `samplingDistance` meters.
   */
  const sampled: PointLike[] = [points[0]];
  let lastPoint = points[0];
  let accumulatedDistance = 0;

  for (let i = 1; i < points.length; i++) {
    const distance = haversine(lastPoint, points[i]);
    accumulatedDistance += distance;

    if (accumulatedDistance >= samplingDistance) {
      sampled.push(points[i]);
      lastPoint = points[i];
      accumulatedDistance = 0;
    }
  }

  /**
   * Always include end point for accurate destination weather.
   */
  const lastRoutePoint = points[points.length - 1];
  if (sampled[sampled.length - 1] !== lastRoutePoint) {
    sampled.push(lastRoutePoint);
  }

  /**
   * Step 2: Deduplicate by coordsKey.
   * Points within same 0.01° grid cell (≈1.1km) get merged.
   * Handles loops and out-and-back routes efficiently.
   */
  const seen = new Set<string>();
  const unique: Coordinates[] = [];

  for (const point of sampled) {
    const key = coordsKey({ lat: point.lat, lon: point.lon });
    if (!seen.has(key)) {
      seen.add(key);
      unique.push({ lat: point.lat, lon: point.lon });
    }
  }

  return unique;
}
