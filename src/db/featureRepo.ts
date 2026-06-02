/**
 * Feature persistence. All reads exclude soft-deleted rows.
 */
import { getDatabase } from './database';
import { newId } from '@/lib/id';
import type { Feature, FeatureInput, Photo } from '@/lib/types';
import type { FeatureGeometry } from '@/lib/geo';

interface FeatureRow {
  id: string;
  name: string;
  notes: string;
  geometry_type: Feature['geometryType'];
  geometry_json: string;
  category_id: string | null;
  created_at: string;
  updated_at: string;
}

interface PhotoRow {
  id: string;
  feature_id: string;
  filename: string;
  width: number | null;
  height: number | null;
  created_at: string;
}

function rowToPhoto(row: PhotoRow): Photo {
  return {
    id: row.id,
    featureId: row.feature_id,
    filename: row.filename,
    width: row.width,
    height: row.height,
    createdAt: row.created_at,
  };
}

function rowToFeature(row: FeatureRow, photos: Photo[]): Feature {
  return {
    id: row.id,
    name: row.name,
    notes: row.notes,
    geometryType: row.geometry_type,
    geometry: JSON.parse(row.geometry_json) as FeatureGeometry,
    categoryId: row.category_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    photos,
  };
}

export async function listFeatures(): Promise<Feature[]> {
  const db = await getDatabase();
  const featureRows = await db.getAllAsync<FeatureRow>(
    'SELECT * FROM features WHERE deleted_at IS NULL ORDER BY created_at DESC'
  );
  const photoRows = await db.getAllAsync<PhotoRow>(
    'SELECT * FROM photos WHERE deleted_at IS NULL ORDER BY created_at ASC'
  );

  const photosByFeature = new Map<string, Photo[]>();
  for (const row of photoRows) {
    const list = photosByFeature.get(row.feature_id) ?? [];
    list.push(rowToPhoto(row));
    photosByFeature.set(row.feature_id, list);
  }

  return featureRows.map((row) => rowToFeature(row, photosByFeature.get(row.id) ?? []));
}

export interface PhotoInput {
  filename: string;
  width: number | null;
  height: number | null;
}

export async function insertFeature(input: FeatureInput, photos: PhotoInput[]): Promise<Feature> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const featureId = newId();

  const photoRecords: Photo[] = photos.map((p) => ({
    id: newId(),
    featureId,
    filename: p.filename,
    width: p.width,
    height: p.height,
    createdAt: now,
  }));

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO features (id, name, notes, geometry_type, geometry_json, category_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      featureId,
      input.name,
      input.notes,
      input.geometry.type,
      JSON.stringify(input.geometry),
      input.categoryId,
      now,
      now
    );
    for (const photo of photoRecords) {
      await db.runAsync(
        `INSERT INTO photos (id, feature_id, filename, width, height, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        photo.id,
        photo.featureId,
        photo.filename,
        photo.width,
        photo.height,
        photo.createdAt
      );
    }
  });

  return {
    id: featureId,
    name: input.name,
    notes: input.notes,
    geometryType: input.geometry.type,
    geometry: input.geometry,
    categoryId: input.categoryId,
    createdAt: now,
    updatedAt: now,
    photos: photoRecords,
  };
}

export interface FeatureUpdate {
  name: string;
  notes: string;
  categoryId: string | null;
  /** Photos to add. */
  newPhotos: PhotoInput[];
  /** Existing photo ids to remove. */
  removedPhotoIds: string[];
}

export async function updateFeature(featureId: string, update: FeatureUpdate): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      'UPDATE features SET name = ?, notes = ?, category_id = ?, updated_at = ? WHERE id = ?',
      update.name,
      update.notes,
      update.categoryId,
      now,
      featureId
    );
    for (const photo of update.newPhotos) {
      await db.runAsync(
        `INSERT INTO photos (id, feature_id, filename, width, height, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        newId(),
        featureId,
        photo.filename,
        photo.width,
        photo.height,
        now
      );
    }
    for (const photoId of update.removedPhotoIds) {
      await db.runAsync('UPDATE photos SET deleted_at = ? WHERE id = ?', now, photoId);
    }
  });
}

export async function softDeleteFeature(featureId: string): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    await db.runAsync('UPDATE features SET deleted_at = ? WHERE id = ?', now, featureId);
    await db.runAsync('UPDATE photos SET deleted_at = ? WHERE feature_id = ?', now, featureId);
  });
}
