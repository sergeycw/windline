import type { ForecastRenderData, RouteRenderData } from './map-renderer.types'
import type { ForecastSummary, WindImpactData } from '@windline/entities'

const CARD_PADDING = 80
const CARD_PADDING_X = 40
const CARD_MARGIN_X = 24
const CARD_MARGIN_BOTTOM = 24
const BORDER_RADIUS = 24
const LINE_HEIGHT = 100
const DATE_SIZE = 48
const TEXT_SIZE = 32

const BG_COLOR = 'rgba(255, 255, 255, 0.98)'
const TEXT_PRIMARY = '#111827'
const TEXT_SECONDARY = '#374151'
const TEXT_MUTED = '#6B7280'

export const LEGEND_MARGIN_X = CARD_MARGIN_X
export const LEGEND_MARGIN_BOTTOM = CARD_MARGIN_BOTTOM

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
  const cardWidth = mapWidth - CARD_MARGIN_X * 2

  let textY = CARD_PADDING + LINE_HEIGHT - 4
  const textElements = lines
    .map((line) => {
      const element = `<text x="${CARD_MARGIN_X + CARD_PADDING_X}" y="${textY}" font-family="Arial, sans-serif" font-size="${line.size}" font-weight="${line.bold ? 'bold' : 'normal'}" fill="${line.color}">${line.text}</text>`
      textY += LINE_HEIGHT
      return element
    })
    .join('\n  ')

  const svgWidth = mapWidth
  const svgHeight = cardHeight

  const svg = `<svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="cardShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="2" stdDeviation="8" flood-color="rgba(0,0,0,0.15)"/>
    </filter>
  </defs>
  <rect x="${CARD_MARGIN_X}" y="0" width="${cardWidth}" height="${cardHeight}" rx="${BORDER_RADIUS}" ry="${BORDER_RADIUS}" fill="${BG_COLOR}" filter="url(#cardShadow)"/>
  ${textElements}
</svg>`

  return Buffer.from(svg)
}

export function getLegendCardHeight(forecast: ForecastRenderData): number {
  const lineCount = forecast.summary.precipitationProbabilityMax > 0 ? 4 : 3
  const contentHeight = lineCount * LINE_HEIGHT
  return contentHeight + CARD_PADDING * 2
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
