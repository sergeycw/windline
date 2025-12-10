import { RoutePoint } from './gpx-parser.interface';

export const toRad = (deg: number): number => (deg * Math.PI) / 180;
const toDeg = (rad: number): number => (rad * 180) / Math.PI;

export interface GeoPoint {
  lat: number;
  lon: number;
}

/**
 * Haversine formula - calculates the great-circle distance between two points on a sphere.
 * Uses Earth's mean radius of 6371km.
 *
 * Formula: a = sin²(Δφ/2) + cos(φ1)·cos(φ2)·sin²(Δλ/2)
 *          c = 2·atan2(√a, √(1−a))
 *          d = R·c
 *
 * @returns Distance in meters
 */
export function haversine(p1: GeoPoint, p2: GeoPoint): number {
  const R = 6371000;

  const dLat = toRad(p2.lat - p1.lat);
  const dLon = toRad(p2.lon - p1.lon);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(p1.lat)) * Math.cos(toRad(p2.lat)) * Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function haversineKm(p1: GeoPoint, p2: GeoPoint): number {
  return haversine(p1, p2) / 1000;
}

/**
 * Initial bearing (forward azimuth) - calculates the direction from one point to another.
 *
 * Formula: θ = atan2(sin(Δλ)·cos(φ2), cos(φ1)·sin(φ2) − sin(φ1)·cos(φ2)·cos(Δλ))
 *
 * @returns Bearing in degrees (0-360, where 0 = North, 90 = East, 180 = South, 270 = West)
 */
export function calculateBearing(from: GeoPoint, to: GeoPoint): number {
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);
  const dLon = toRad(to.lon - from.lon);

  const x = Math.sin(dLon) * Math.cos(lat2);
  const y = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

  const bearing = toDeg(Math.atan2(x, y));
  return (bearing + 360) % 360;
}

/**
 * Adds bearing to each point indicating direction to the next point.
 * The last point has no bearing (undefined) since there's no next point.
 */
export function addBearingsToPoints(points: RoutePoint[]): RoutePoint[] {
  return points.map((point, index) => {
    if (index === points.length - 1) {
      return point;
    }
    return {
      ...point,
      bearing: calculateBearing(point, points[index + 1]),
    };
  });
}

export function calculateElevationGain(points: RoutePoint[]): number {
  let totalGain = 0;

  for (let i = 1; i < points.length; i++) {
    const prevEle = points[i - 1].ele;
    const currEle = points[i].ele;

    if (prevEle !== undefined && currEle !== undefined) {
      const diff = currEle - prevEle;
      if (diff > 0) {
        totalGain += diff;
      }
    }
  }

  return Math.round(totalGain);
}
