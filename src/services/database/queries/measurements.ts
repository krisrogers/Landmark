import type { DatabaseService } from '../DatabaseService';
import type { Measurement, CreateMeasurementInput, UpdateMeasurementInput, MeasurementMethod, ConfidenceLevel } from '@/types';
import { generateId } from '@/utils/uuid';
import { toISOString, fromISOString } from '@/utils/datetime';

interface MeasurementRow {
  id: string;
  feature_id: string;
  metric: string;
  value: number;
  unit: string;
  method: MeasurementMethod;
  accuracy: number | null;
  confidence: ConfidenceLevel | null;
  notes: string | null;
  recorded_at: string;
  created_at: string;
}

function rowToMeasurement(row: MeasurementRow): Measurement {
  return {
    id: row.id,
    featureId: row.feature_id,
    metric: row.metric,
    value: row.value,
    unit: row.unit,
    method: row.method,
    accuracy: row.accuracy || undefined,
    confidence: row.confidence || undefined,
    notes: row.notes || undefined,
    recordedAt: fromISOString(row.recorded_at),
    createdAt: fromISOString(row.created_at),
  };
}

export async function getMeasurementsByFeatureId(
  db: DatabaseService,
  featureId: string
): Promise<Measurement[]> {
  const rows = await db.all<MeasurementRow>(`
    SELECT * FROM measurements
    WHERE feature_id = ?
    ORDER BY recorded_at DESC
  `, [featureId]);
  return rows.map(rowToMeasurement);
}

export async function getMeasurementById(
  db: DatabaseService,
  id: string
): Promise<Measurement | null> {
  const row = await db.get<MeasurementRow>(`
    SELECT * FROM measurements WHERE id = ?
  `, [id]);
  return row ? rowToMeasurement(row) : null;
}

export async function getAllMeasurements(db: DatabaseService): Promise<Measurement[]> {
  const rows = await db.all<MeasurementRow>(`
    SELECT * FROM measurements ORDER BY recorded_at DESC
  `);
  return rows.map(rowToMeasurement);
}

export async function getMeasurementsByMetric(
  db: DatabaseService,
  metric: string
): Promise<Measurement[]> {
  const rows = await db.all<MeasurementRow>(`
    SELECT * FROM measurements
    WHERE metric = ?
    ORDER BY recorded_at DESC
  `, [metric]);
  return rows.map(rowToMeasurement);
}

export async function createMeasurement(
  db: DatabaseService,
  input: CreateMeasurementInput
): Promise<Measurement> {
  const id = generateId();
  const now = new Date();
  const recordedAt = input.recordedAt || now;

  await db.run(`
    INSERT INTO measurements (
      id, feature_id, metric, value, unit, method,
      accuracy, confidence, notes, recorded_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id,
    input.featureId,
    input.metric,
    input.value,
    input.unit,
    input.method || 'estimated',
    input.accuracy || null,
    input.confidence || null,
    input.notes || null,
    toISOString(recordedAt),
    toISOString(now),
  ]);

  const measurement = await getMeasurementById(db, id);
  if (!measurement) throw new Error('Failed to create measurement');
  return measurement;
}

export async function updateMeasurement(
  db: DatabaseService,
  id: string,
  input: UpdateMeasurementInput
): Promise<Measurement> {
  const existing = await getMeasurementById(db, id);
  if (!existing) throw new Error('Measurement not found');

  await db.run(`
    UPDATE measurements SET
      value = COALESCE(?, value),
      unit = COALESCE(?, unit),
      method = COALESCE(?, method),
      accuracy = COALESCE(?, accuracy),
      confidence = COALESCE(?, confidence),
      notes = COALESCE(?, notes)
    WHERE id = ?
  `, [
    input.value ?? null,
    input.unit || null,
    input.method || null,
    input.accuracy ?? null,
    input.confidence || null,
    input.notes || null,
    id,
  ]);

  const measurement = await getMeasurementById(db, id);
  if (!measurement) throw new Error('Failed to update measurement');
  return measurement;
}

export async function deleteMeasurement(db: DatabaseService, id: string): Promise<void> {
  await db.run('DELETE FROM measurements WHERE id = ?', [id]);
}

export async function getMeasurementCount(
  db: DatabaseService,
  featureId?: string
): Promise<number> {
  if (featureId) {
    const result = await db.get<{ count: number }>(
      'SELECT COUNT(*) as count FROM measurements WHERE feature_id = ?',
      [featureId]
    );
    return result?.count || 0;
  }
  const result = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM measurements');
  return result?.count || 0;
}

export async function getDistinctMetrics(db: DatabaseService): Promise<string[]> {
  const rows = await db.all<{ metric: string }>('SELECT DISTINCT metric FROM measurements ORDER BY metric');
  return rows.map(r => r.metric);
}
