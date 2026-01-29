import type { GeoJSON } from 'geojson';

export type GeometryType = 'Point' | 'LineString' | 'Polygon';

export interface PointGeometry {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

export interface LineStringGeometry {
  type: 'LineString';
  coordinates: [number, number][];
}

export interface PolygonGeometry {
  type: 'Polygon';
  coordinates: [number, number][][];
}

export type FeatureGeometry = PointGeometry | LineStringGeometry | PolygonGeometry;

export interface Feature {
  id: string;
  name: string;
  description?: string;
  geometryType: GeometryType;
  geometry: FeatureGeometry;
  templateId?: string;
  tags: string[];
  properties: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateFeatureInput {
  name: string;
  description?: string;
  geometryType: GeometryType;
  geometry: FeatureGeometry;
  templateId?: string;
  tags?: string[];
  properties?: Record<string, unknown>;
}

export interface UpdateFeatureInput {
  name?: string;
  description?: string;
  geometry?: FeatureGeometry;
  tags?: string[];
  properties?: Record<string, unknown>;
}

export interface FeatureWithTimeline extends Feature {
  observationCount: number;
  measurementCount: number;
  taskCount: number;
  lastActivity?: Date;
}
