import type { ForecastRenderData, RouteRenderData } from './map-renderer.types.js';

const LEGEND_HEIGHT = 80;
const BG_COLOR = '#FFFFFF';
const TEXT_PRIMARY = '#1F2937';
const TEXT_SECONDARY = '#4B5563';
const TEXT_MUTED = '#6B7280';

export interface LegendOptions {
  width: number;
}

export function createLegendSvg(
  route: RouteRenderData,
  forecast: ForecastRenderData,
  options: LegendOptions,
): Buffer {
  const { width } = options;
  const { summary, windImpact, date, startHour } = forecast;

  const distanceKm = (route.distance / 1000).toFixed(1);
  const formattedDate = formatDate(date);

  const tempRange = `${summary.temperatureMin}–${summary.temperatureMax}°C`;
  const windRange = `${summary.windSpeedMin}–${summary.windSpeedMax} km/h`;
  const gusts = summary.windGustsMax > summary.windSpeedMax ? ` (gusts ${summary.windGustsMax})` : '';
  const precip = summary.precipitationProbabilityMax > 0 ? `${summary.precipitationProbabilityMax}%` : '';

  const headPct = Math.round(windImpact.distribution.headwindPercent);
  const tailPct = Math.round(windImpact.distribution.tailwindPercent);
  const crossPct = Math.round(windImpact.distribution.crosswindPercent);

  const svg = `<svg width="${width}" height="${LEGEND_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="${BG_COLOR}"/>

  <text x="12" y="22" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="${TEXT_PRIMARY}">
    ${escapeXml(route.name)} (${distanceKm} km)
  </text>

  <text x="12" y="44" font-family="Arial, sans-serif" font-size="12" fill="${TEXT_SECONDARY}">
    ${formattedDate} ${startHour}:00  |  ${tempRange}  |  ${windRange}${gusts}${precip ? `  |  ${precip}` : ''}
  </text>

  <text x="12" y="66" font-family="Arial, sans-serif" font-size="11" fill="${TEXT_MUTED}">
    Wind: ▲ headwind ${headPct}%   ▼ tailwind ${tailPct}%   ◀▶ crosswind ${crossPct}%
  </text>
</svg>`;

  return Buffer.from(svg);
}

export function getLegendHeight(): number {
  return LEGEND_HEIGHT;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
