import { WindImpact, SegmentWindImpact } from './weather.types';

const toRad = (deg: number): number => (deg * Math.PI) / 180;

/**
 * Classifies wind relative to movement direction.
 *
 * Wind direction is "from" direction (e.g., 90° = wind from East).
 * Bearing is movement direction (e.g., 90° = moving East).
 *
 * If wind is from East (90°) and you're moving East (90°),
 * the wind hits your face → headwind.
 */
export function classifyWind(
  bearing: number,
  windDirection: number,
  windSpeed: number,
): SegmentWindImpact {
  /**
   * Calculate angle between wind source and movement direction.
   * 0° = pure headwind (wind in face)
   * 180° = pure tailwind (wind in back)
   * 90°/270° = pure crosswind
   */
  const relativeAngle = toRad(windDirection - bearing);

  /**
   * Head component: positive = headwind, negative = tailwind.
   * cos(0°) = 1 → full headwind
   * cos(180°) = -1 → full tailwind
   */
  const headComponent = windSpeed * Math.cos(relativeAngle);

  /**
   * Cross component: always positive (absolute value).
   * sin(90°) = 1 → full crosswind
   * sin(0°) = 0 → no crosswind
   */
  const crossComponent = Math.abs(windSpeed * Math.sin(relativeAngle));

  return {
    headComponent,
    crossComponent,
    isHeadwind: headComponent > 0,
  };
}

export interface WindSegmentInput {
  bearing: number;
  windDirection: number;
  windSpeed: number;
}

/**
 * Calculates aggregate wind impact across all route segments.
 *
 * Returns average wind speeds and distribution percentages
 * for headwind, tailwind, and crosswind.
 */
export function calculateWindImpact(segments: WindSegmentInput[]): WindImpact {
  if (segments.length === 0) {
    return {
      headwind: 0,
      tailwind: 0,
      crosswind: 0,
      distribution: {
        headwindPercent: 0,
        tailwindPercent: 0,
        crosswindPercent: 0,
      },
    };
  }

  let totalHeadwind = 0;
  let totalTailwind = 0;
  let totalCrosswind = 0;
  let headwindCount = 0;
  let tailwindCount = 0;
  let crosswindDominantCount = 0;

  for (const segment of segments) {
    const impact = classifyWind(segment.bearing, segment.windDirection, segment.windSpeed);

    totalCrosswind += impact.crossComponent;

    if (impact.isHeadwind) {
      totalHeadwind += impact.headComponent;
      headwindCount++;
    } else {
      totalTailwind += Math.abs(impact.headComponent);
      tailwindCount++;
    }

    /**
     * Crosswind is "dominant" when it's stronger than head/tail component.
     */
    if (impact.crossComponent > Math.abs(impact.headComponent)) {
      crosswindDominantCount++;
    }
  }

  const count = segments.length;

  return {
    headwind: Math.round(totalHeadwind / count),
    tailwind: Math.round(totalTailwind / count),
    crosswind: Math.round(totalCrosswind / count),
    distribution: {
      headwindPercent: Math.round((headwindCount / count) * 100),
      tailwindPercent: Math.round((tailwindCount / count) * 100),
      crosswindPercent: Math.round((crosswindDominantCount / count) * 100),
    },
  };
}
