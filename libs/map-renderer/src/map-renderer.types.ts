import type { ForecastSummary, WindImpactData } from '@windline/entities';

export interface RouteRenderData {
  points: Array<{ lat: number; lon: number }>;
  renderPolyline?: string;
  name: string;
  distance: number;
}

export interface ForecastRenderData {
  summary: ForecastSummary;
  windImpact: WindImpactData;
  date: string;
  startHour: number;
}

export interface WindMarkerData {
  lat: number;
  lon: number;
  windDirection: number;
  windSpeed: number;
}

export interface RenderMapInput {
  route: RouteRenderData;
  forecast: ForecastRenderData;
  windMarkers: WindMarkerData[];
}

export interface RenderMapOptions {
  width?: number;
  height?: number;
}

export interface RenderMapResult {
  buffer: Buffer;
  mimeType: 'image/png';
}

export const MAP_RENDERER = Symbol('MAP_RENDERER');
