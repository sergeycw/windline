import type { ForecastRenderData, RouteRenderData } from './map-renderer.types'

const CARD_WIDTH = 260
const CARD_PADDING = 12
const BORDER_RADIUS = 12
const LINE_HEIGHT = 18
const TITLE_SIZE = 14
const TEXT_SIZE = 11

const BG_COLOR = 'rgba(255, 255, 255, 0.92)'
const SHADOW_COLOR = 'rgba(0, 0, 0, 0.15)'
const TEXT_PRIMARY = '#1F2937'
const TEXT_SECONDARY = '#4B5563'
const TEXT_MUTED = '#6B7280'

export interface LegendCardOptions {
  x: number
  y: number
}

export function createLegendCardSvg(
  route: RouteRenderData,
  forecast: ForecastRenderData,
  options: LegendCardOptions = { x: 16, y: 16 },
): Buffer {
  const { summary, windImpact, date, startHour } = forecast

  const distanceKm = (route.distance / 1000).toFixed(1)
  const formattedDate = formatDate(date)

  const tempRange = `${summary.temperatureMin}–${summary.temperatureMax}°C`
  const windRange = `${summary.windSpeedMin}–${summary.windSpeedMax} km/h`
  const gusts =
    summary.windGustsMax > summary.windSpeedMax ? ` (gusts ${summary.windGustsMax})` : ''
  const precip =
    summary.precipitationProbabilityMax > 0 ? `${summary.precipitationProbabilityMax}%` : ''

  const headPct = Math.round(windImpact.distribution.headwindPercent)
  const tailPct = Math.round(windImpact.distribution.tailwindPercent)
  const crossPct = Math.round(windImpact.distribution.crosswindPercent)

  const lines = [
    { text: escapeXml(route.name), size: TITLE_SIZE, color: TEXT_PRIMARY, bold: true },
    { text: `${distanceKm} km`, size: TEXT_SIZE, color: TEXT_SECONDARY, bold: false },
    {
      text: `${formattedDate} ${startHour}:00`,
      size: TEXT_SIZE,
      color: TEXT_SECONDARY,
      bold: false,
    },
    { text: `${tempRange}  •  ${windRange}${gusts}`, size: TEXT_SIZE, color: TEXT_SECONDARY, bold: false },
  ]

  if (precip) {
    lines.push({ text: `Precip: ${precip}`, size: TEXT_SIZE, color: TEXT_SECONDARY, bold: false })
  }

  lines.push({
    text: `↑${headPct}%  ↓${tailPct}%  ↔${crossPct}%`,
    size: TEXT_SIZE,
    color: TEXT_MUTED,
    bold: false,
  })

  const contentHeight = lines.length * LINE_HEIGHT
  const cardHeight = contentHeight + CARD_PADDING * 2

  let textY = options.y + CARD_PADDING + LINE_HEIGHT - 4
  const textElements = lines
    .map((line) => {
      const element = `<text x="${options.x + CARD_PADDING}" y="${textY}" font-family="Arial, sans-serif" font-size="${line.size}" font-weight="${line.bold ? 'bold' : 'normal'}" fill="${line.color}">${line.text}</text>`
      textY += LINE_HEIGHT
      return element
    })
    .join('\n  ')

  const svg = `<svg width="${CARD_WIDTH + options.x * 2}" height="${cardHeight + options.y * 2}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="${SHADOW_COLOR}"/>
    </filter>
  </defs>
  <rect x="${options.x}" y="${options.y}" width="${CARD_WIDTH}" height="${cardHeight}" rx="${BORDER_RADIUS}" ry="${BORDER_RADIUS}" fill="${BG_COLOR}" filter="url(#shadow)"/>
  ${textElements}
</svg>`

  return Buffer.from(svg)
}

export function getLegendCardDimensions(
  forecast: ForecastRenderData,
): { width: number; height: number } {
  const lineCount = forecast.summary.precipitationProbabilityMax > 0 ? 6 : 5
  const contentHeight = lineCount * LINE_HEIGHT
  const cardHeight = contentHeight + CARD_PADDING * 2
  return { width: CARD_WIDTH + 32, height: cardHeight + 32 }
}

function formatDate(dateStr: string): string {
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

  return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
