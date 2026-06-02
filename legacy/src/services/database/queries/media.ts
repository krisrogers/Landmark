import type { DatabaseService } from '../DatabaseService';
import type { Media, CreateMediaInput, MediaType } from '@/types';
import { generateId } from '@/utils/uuid';
import { toISOString, fromISOString } from '@/utils/datetime';

interface MediaRow {
  id: string;
  feature_id: string | null;
  observation_id: string | null;
  type: MediaType;
  filename: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number | null;
  width: number | null;
  height: number | null;
  duration_seconds: number | null;
  caption: string | null;
  recorded_at: string;
  created_at: string;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
}

function rowToMedia(row: MediaRow): Media {
  return {
    id: row.id,
    featureId: row.feature_id || undefined,
    observationId: row.observation_id || undefined,
    type: row.type,
    filename: row.filename,
    storagePath: row.storage_path,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes || undefined,
    width: row.width || undefined,
    height: row.height || undefined,
    durationSeconds: row.duration_seconds || undefined,
    caption: row.caption || undefined,
    recordedAt: fromISOString(row.recorded_at),
    createdAt: fromISOString(row.created_at),
    latitude: row.latitude || undefined,
    longitude: row.longitude || undefined,
    accuracy: row.accuracy || undefined,
  };
}

export async function getMediaByFeatureId(
  db: DatabaseService,
  featureId: string
): Promise<Media[]> {
  const rows = await db.all<MediaRow>(`
    SELECT * FROM media
    WHERE feature_id = ?
    ORDER BY recorded_at DESC
  `, [featureId]);
  return rows.map(rowToMedia);
}

export async function getMediaByObservationId(
  db: DatabaseService,
  observationId: string
): Promise<Media[]> {
  const rows = await db.all<MediaRow>(`
    SELECT * FROM media
    WHERE observation_id = ?
    ORDER BY recorded_at DESC
  `, [observationId]);
  return rows.map(rowToMedia);
}

export async function getMediaById(db: DatabaseService, id: string): Promise<Media | null> {
  const row = await db.get<MediaRow>('SELECT * FROM media WHERE id = ?', [id]);
  return row ? rowToMedia(row) : null;
}

export async function getAllMedia(db: DatabaseService): Promise<Media[]> {
  const rows = await db.all<MediaRow>('SELECT * FROM media ORDER BY recorded_at DESC');
  return rows.map(rowToMedia);
}

export async function getMediaByType(db: DatabaseService, type: MediaType): Promise<Media[]> {
  const rows = await db.all<MediaRow>(`
    SELECT * FROM media WHERE type = ? ORDER BY recorded_at DESC
  `, [type]);
  return rows.map(rowToMedia);
}

export async function createMedia(
  db: DatabaseService,
  input: CreateMediaInput
): Promise<Media> {
  const id = generateId();
  const now = new Date();
  const recordedAt = input.recordedAt || now;

  await db.run(`
    INSERT INTO media (
      id, feature_id, observation_id, type, filename, storage_path,
      mime_type, size_bytes, width, height, duration_seconds, caption,
      recorded_at, created_at, latitude, longitude, accuracy
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id,
    input.featureId || null,
    input.observationId || null,
    input.type,
    input.filename,
    input.storagePath,
    input.mimeType,
    input.sizeBytes || null,
    input.width || null,
    input.height || null,
    input.durationSeconds || null,
    input.caption || null,
    toISOString(recordedAt),
    toISOString(now),
    input.latitude || null,
    input.longitude || null,
    input.accuracy || null,
  ]);

  const media = await getMediaById(db, id);
  if (!media) throw new Error('Failed to create media');
  return media;
}

export async function updateMediaCaption(
  db: DatabaseService,
  id: string,
  caption: string
): Promise<Media> {
  await db.run('UPDATE media SET caption = ? WHERE id = ?', [caption, id]);
  const media = await getMediaById(db, id);
  if (!media) throw new Error('Failed to update media');
  return media;
}

export async function deleteMedia(db: DatabaseService, id: string): Promise<void> {
  await db.run('DELETE FROM media WHERE id = ?', [id]);
}

export async function getMediaCount(
  db: DatabaseService,
  featureId?: string
): Promise<number> {
  if (featureId) {
    const result = await db.get<{ count: number }>(
      'SELECT COUNT(*) as count FROM media WHERE feature_id = ?',
      [featureId]
    );
    return result?.count || 0;
  }
  const result = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM media');
  return result?.count || 0;
}

export async function getTotalMediaSize(db: DatabaseService): Promise<number> {
  const result = await db.get<{ total: number }>(
    'SELECT COALESCE(SUM(size_bytes), 0) as total FROM media'
  );
  return result?.total || 0;
}
