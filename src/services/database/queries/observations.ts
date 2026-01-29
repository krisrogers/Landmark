import type { DatabaseService } from '../DatabaseService';
import type { Observation, CreateObservationInput, UpdateObservationInput } from '@/types';
import { generateId } from '@/utils/uuid';
import { toISOString, fromISOString } from '@/utils/datetime';

interface ObservationRow {
  id: string;
  feature_id: string;
  notes: string | null;
  tags: string;
  recorded_at: string;
  created_at: string;
  observer_latitude: number | null;
  observer_longitude: number | null;
  observer_accuracy: number | null;
}

function rowToObservation(row: ObservationRow): Observation {
  return {
    id: row.id,
    featureId: row.feature_id,
    notes: row.notes || undefined,
    tags: JSON.parse(row.tags || '[]'),
    recordedAt: fromISOString(row.recorded_at),
    createdAt: fromISOString(row.created_at),
    observerLatitude: row.observer_latitude || undefined,
    observerLongitude: row.observer_longitude || undefined,
    observerAccuracy: row.observer_accuracy || undefined,
  };
}

export async function getObservationsByFeatureId(
  db: DatabaseService,
  featureId: string
): Promise<Observation[]> {
  const rows = await db.all<ObservationRow>(`
    SELECT * FROM observations
    WHERE feature_id = ?
    ORDER BY recorded_at DESC
  `, [featureId]);
  return rows.map(rowToObservation);
}

export async function getObservationById(
  db: DatabaseService,
  id: string
): Promise<Observation | null> {
  const row = await db.get<ObservationRow>(`
    SELECT * FROM observations WHERE id = ?
  `, [id]);
  return row ? rowToObservation(row) : null;
}

export async function getAllObservations(db: DatabaseService): Promise<Observation[]> {
  const rows = await db.all<ObservationRow>(`
    SELECT * FROM observations ORDER BY recorded_at DESC
  `);
  return rows.map(rowToObservation);
}

export async function createObservation(
  db: DatabaseService,
  input: CreateObservationInput
): Promise<Observation> {
  const id = generateId();
  const now = new Date();
  const recordedAt = input.recordedAt || now;

  await db.run(`
    INSERT INTO observations (
      id, feature_id, notes, tags, recorded_at, created_at,
      observer_latitude, observer_longitude, observer_accuracy
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id,
    input.featureId,
    input.notes || null,
    JSON.stringify(input.tags || []),
    toISOString(recordedAt),
    toISOString(now),
    input.observerLatitude || null,
    input.observerLongitude || null,
    input.observerAccuracy || null,
  ]);

  const observation = await getObservationById(db, id);
  if (!observation) throw new Error('Failed to create observation');
  return observation;
}

export async function updateObservation(
  db: DatabaseService,
  id: string,
  input: UpdateObservationInput
): Promise<Observation> {
  const existing = await getObservationById(db, id);
  if (!existing) throw new Error('Observation not found');

  if (input.notes !== undefined || input.tags !== undefined) {
    await db.run(`
      UPDATE observations SET
        notes = COALESCE(?, notes),
        tags = COALESCE(?, tags)
      WHERE id = ?
    `, [
      input.notes || null,
      input.tags ? JSON.stringify(input.tags) : null,
      id,
    ]);
  }

  const observation = await getObservationById(db, id);
  if (!observation) throw new Error('Failed to update observation');
  return observation;
}

export async function deleteObservation(db: DatabaseService, id: string): Promise<void> {
  await db.run('DELETE FROM observations WHERE id = ?', [id]);
}

export async function getObservationCount(
  db: DatabaseService,
  featureId?: string
): Promise<number> {
  if (featureId) {
    const result = await db.get<{ count: number }>(
      'SELECT COUNT(*) as count FROM observations WHERE feature_id = ?',
      [featureId]
    );
    return result?.count || 0;
  }
  const result = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM observations');
  return result?.count || 0;
}
