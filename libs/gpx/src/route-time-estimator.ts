import { RoutePoint } from './gpx-parser.interface';
import { calculateElevationGain } from './geo-utils';

export interface RouteTimeEstimate {
  estimatedTimeHours: number;
  adjustedSpeedKmh: number;
  elevationGain: number;
}

export function estimateRouteTime(
  distanceMeters: number,
  points: RoutePoint[],
): RouteTimeEstimate {
  const distanceKm = distanceMeters / 1000;
  const elevationGain = calculateElevationGain(points);

  let baseSpeed: number;
  if (distanceKm > 50) {
    baseSpeed = 20;
  } else if (distanceKm >= 20) {
    baseSpeed = 16;
  } else {
    baseSpeed = 12;
  }

  let speedMultiplier = 1.0;
  if (elevationGain > 2000) {
    speedMultiplier = 0.65;
  } else if (elevationGain > 1000) {
    speedMultiplier = 0.8;
  }

  const adjustedSpeedKmh = baseSpeed * speedMultiplier;
  const estimatedTimeHours = distanceKm / adjustedSpeedKmh;

  return {
    estimatedTimeHours: Math.round(estimatedTimeHours * 10) / 10,
    adjustedSpeedKmh,
    elevationGain,
  };
}
