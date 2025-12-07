declare module '@mapbox/polyline' {
  export function encode(coordinates: [number, number][], precision?: number): string;
  export function decode(str: string, precision?: number): [number, number][];
}
