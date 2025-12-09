import type { ForecastRenderData, RouteRenderData } from './map-renderer.types'
import type { ForecastSummary, WindImpactData } from '@windline/entities'

const CARD_PADDING = 16
const CARD_PADDING_X = 24
const BORDER_RADIUS = 12
const LINE_HEIGHT = 22
const DATE_SIZE = 18
const TEXT_SIZE = 13

const BG_COLOR = 'rgba(255, 255, 255, 0.95)'
const SHADOW_COLOR = 'rgba(0, 0, 0, 0.12)'
const TEXT_PRIMARY = '#111827'
const TEXT_SECONDARY = '#374151'
const TEXT_MUTED = '#4B5563'
export const SHADOW_MARGIN = 16

export function createLegendCardSvg(
  route: RouteRenderData,
  forecast: ForecastRenderData,
  mapWidth: number,
): Buffer {
  const { summary, windImpact, date, startHour, estimatedTimeHours, elevationGain } = forecast

  const distanceKm = (route.distance / 1000).toFixed(1)
  const datePrimary = formatDatePrimary(date, startHour)
  const duration = formatDuration(estimatedTimeHours)
  const elevation = formatElevation(elevationGain)
  const temperature = formatTemperature(summary)
  const wind = formatWind(summary)
  const precip = formatPrecip(summary)
  const windDistribution = formatWindDistribution(windImpact)

  const routeInfoParts = [
    `${distanceKm} km`,
    duration,
    elevation,
    temperature,
    wind,
  ].filter(Boolean)

  const lines = [
    { text: datePrimary, size: DATE_SIZE, color: TEXT_PRIMARY, bold: true },
    { text: routeInfoParts.join('  •  '), size: TEXT_SIZE, color: TEXT_SECONDARY, bold: false },
  ]

  if (precip) {
    lines.push({ text: precip, size: TEXT_SIZE, color: TEXT_SECONDARY, bold: false })
  }

  lines.push({
    text: windDistribution,
    size: TEXT_SIZE,
    color: TEXT_MUTED,
    bold: false,
  })

  const contentHeight = lines.length * LINE_HEIGHT
  const cardHeight = contentHeight + CARD_PADDING * 2

  let textY = SHADOW_MARGIN + CARD_PADDING + LINE_HEIGHT - 4
  const textElements = lines
    .map((line) => {
      const element = `<text x="${CARD_PADDING_X}" y="${textY}" font-family="Arial, sans-serif" font-size="${line.size}" font-weight="${line.bold ? 'bold' : 'normal'}" fill="${line.color}">${line.text}</text>`
      textY += LINE_HEIGHT
      return element
    })
    .join('\n  ')

  const svgWidth = mapWidth
  const svgHeight = cardHeight + SHADOW_MARGIN

  const svg = `<svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="shadow" x="0" y="-50%" width="100%" height="150%">
      <feDropShadow dx="0" dy="-2" stdDeviation="4" flood-color="${SHADOW_COLOR}"/>
    </filter>
  </defs>
  <rect x="0" y="${SHADOW_MARGIN}" width="${mapWidth}" height="${cardHeight}" fill="${BG_COLOR}" filter="url(#shadow)"/>
  ${textElements}
</svg>`

  return Buffer.from(svg)
}

export function getLegendCardHeight(forecast: ForecastRenderData): number {
  const lineCount = forecast.summary.precipitationProbabilityMax > 0 ? 4 : 3
  const contentHeight = lineCount * LINE_HEIGHT
  return contentHeight + CARD_PADDING * 2 + SHADOW_MARGIN
}

function formatDatePrimary(dateStr: string, startHour: number): string {
  const date = new Date(dateStr)
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ]
  const hour = startHour.toString().padStart(2, '0')
  return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}, ${hour}:00`
}

function formatTemperature(summary: ForecastSummary): string {
  const { temperatureMin, temperatureMax } = summary
  if (temperatureMin === temperatureMax) {
    return `${temperatureMax}°C`
  }
  return `${temperatureMin}…${temperatureMax}°C`
}

function formatWind(summary: ForecastSummary): string {
  const { windSpeedMin, windSpeedMax, windGustsMax } = summary
  const speedPart =
    windSpeedMin === windSpeedMax
      ? `${windSpeedMax} km/h`
      : `${windSpeedMin}–${windSpeedMax} km/h`

  if (windGustsMax > windSpeedMax) {
    return `${speedPart}, gusts ${windGustsMax}`
  }
  return speedPart
}

function formatPrecip(summary: ForecastSummary): string | null {
  const { precipitationProbabilityMax, precipitationTotal } = summary
  if (precipitationProbabilityMax === 0) return null

  if (precipitationTotal > 0) {
    return `precip ${precipitationTotal} mm, ${precipitationProbabilityMax}%`
  }
  return `precip ${precipitationProbabilityMax}%`
}

function formatWindDistribution(windImpact: WindImpactData): string {
  const { headwindPercent, tailwindPercent, crosswindPercent } = windImpact.distribution
  return `headwind ${Math.round(headwindPercent)}%  tailwind ${Math.round(tailwindPercent)}%  crosswind ${Math.round(crosswindPercent)}%`
}

function formatDuration(hours: number | null | undefined): string | null {
  if (!hours) return null
  if (hours < 1) return `~${Math.round(hours * 60)}min`
  return `~${hours.toFixed(1)}h`
}

function formatElevation(meters: number | null | undefined): string | null {
  if (!meters || meters === 0) return null
  return `↑${meters}m`
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
