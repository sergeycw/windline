export interface RoutePoint {
  lat: number;
  lon: number;
  ele?: number;
  time?: Date;
  bearing?: number;
}

export interface ParsedRoute {
  name: string;
  points: RoutePoint[];
  distance: number;
}

export interface GpxParser {
  parse(gpxContent: string): ParsedRoute;
}

export const GPX_PARSER = Symbol('GPX_PARSER');
