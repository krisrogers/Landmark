import type { FeatureGeometry, GeometryType } from './geo';

/** A user-defined group for organizing features (e.g. "Water", "Fences", "Trees"). */
export interface Category {
  id: string;
  name: string;
  color: string;
  createdAt: string; // ISO 8601
  updatedAt: string;
}

/** A photo attached to a feature. Files live in the app's document directory. */
export interface Photo {
  id: string;
  featureId: string;
  /** Filename relative to the photos directory (not an absolute path – the
   *  document directory can move between app updates). */
  filename: string;
  width: number | null;
  height: number | null;
  createdAt: string;
}

/** A mapped reference on the property: a pin, a walked path, or a walked area. */
export interface Feature {
  id: string;
  name: string;
  notes: string;
  geometryType: GeometryType;
  geometry: FeatureGeometry;
  categoryId: string | null;
  createdAt: string;
  updatedAt: string;
  photos: Photo[];
}

export interface FeatureInput {
  name: string;
  notes: string;
  geometry: FeatureGeometry;
  categoryId: string | null;
}
