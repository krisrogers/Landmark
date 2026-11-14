import type { PointGeometry } from './feature';

/**
 * An Asset is a discrete thing you own and maintain (tractor, house, sheep mob).
 * Unlike a Place, its location is optional and can change — either a map pin
 * (a GeoJSON Point) or a reference to a Place it currently lives at. An asset's
 * tasks travel with it when it moves.
 */
export interface Asset {
  id: string;
  name: string;
  description?: string;
  category?: string;
  location?: PointGeometry;
  placeId?: string;
  tags: string[];
  properties: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAssetInput {
  name: string;
  description?: string;
  category?: string;
  location?: PointGeometry;
  placeId?: string;
  tags?: string[];
  properties?: Record<string, unknown>;
}

export interface UpdateAssetInput {
  name?: string;
  description?: string;
  category?: string;
  location?: PointGeometry | null;
  placeId?: string | null;
  tags?: string[];
  properties?: Record<string, unknown>;
}
