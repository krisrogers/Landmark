declare module '@turf/turf' {
  export interface Feature<G = Geometry, P = Record<string, unknown>> {
    type: 'Feature';
    geometry: G;
    properties: P;
  }

  export interface Point {
    type: 'Point';
    coordinates: [number, number];
  }

  export interface LineString {
    type: 'LineString';
    coordinates: [number, number][];
  }

  export interface MultiLineString {
    type: 'MultiLineString';
    coordinates: [number, number][][];
  }

  export interface Polygon {
    type: 'Polygon';
    coordinates: [number, number][][];
  }

  export type Geometry = Point | LineString | MultiLineString | Polygon;

  export function point(coordinates: [number, number]): Feature<Point>;
  export function lineString(coordinates: [number, number][]): Feature<LineString>;
  export function polygon(coordinates: [number, number][][]): Feature<Polygon>;

  export function area(feature: Feature<Polygon>): number;
  export function length(feature: Feature<LineString>, options?: { units: string }): number;
  export function distance(from: Feature<Point>, to: Feature<Point>, options?: { units: string }): number;
  export function centroid(feature: Feature): Feature<Point>;
  export function bbox(feature: Feature): [number, number, number, number];
  export function booleanPointInPolygon(point: Feature<Point>, polygon: Feature<Polygon>): boolean;
  export function polygonToLine(polygon: Feature<Polygon>): Feature<LineString | MultiLineString>;
}
