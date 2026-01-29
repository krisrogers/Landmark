import type { DatabaseService } from '../DatabaseService';
import type { Feature, CreateFeatureInput, UpdateFeatureInput, GeometryType } from '@/types';
import { generateId } from '@/utils/uuid';
import { toISOString, fromISOString } from '@/utils/datetime';

interface FeatureRow {
  id: string;
  name: string;
  description: string | null;
  geometry_type: GeometryType;
  geometry: string;
  template_id: string | null;
  tags: string;
  properties: string;
  created_at: string;
  updated_at: string;
}

function rowToFeature(row: FeatureRow): Feature {
  return {
    id: row.id,
    name: row.name,
    description: row.description || undefined,
    geometryType: row.geometry_type,
    geometry: JSON.parse(row.geometry),
    templateId: row.template_id || undefined,
    tags: JSON.parse(row.tags || '[]'),
    properties: JSON.parse(row.properties || '{}'),
    createdAt: fromISOString(row.created_at),
    updatedAt: fromISOString(row.updated_at),
  };
}

export async function getAllFeatures(db: DatabaseService): Promise<Feature[]> {
  const rows = await db.all<FeatureRow>(`
    SELECT id, name, description, geometry_type, geometry,
           template_id, tags, properties, created_at, updated_at
    FROM features
    ORDER BY created_at DESC
  `);
  return rows.map(rowToFeature);
}

export async function getFeatureById(db: DatabaseService, id: string): Promise<Feature | null> {
  const row = await db.get<FeatureRow>(`
    SELECT id, name, description, geometry_type, geometry,
           template_id, tags, properties, created_at, updated_at
    FROM features
    WHERE id = ?
  `, [id]);
  return row ? rowToFeature(row) : null;
}

export async function getFeaturesByType(
  db: DatabaseService,
  geometryType: GeometryType
): Promise<Feature[]> {
  const rows = await db.all<FeatureRow>(`
    SELECT * FROM features
    WHERE geometry_type = ?
    ORDER BY created_at DESC
  `, [geometryType]);
  return rows.map(rowToFeature);
}

export async function getFeaturesByTag(db: DatabaseService, tag: string): Promise<Feature[]> {
  const rows = await db.all<FeatureRow>(`
    SELECT * FROM features
    WHERE tags LIKE ?
    ORDER BY created_at DESC
  `, [`%"${tag}"%`]);
  return rows.map(rowToFeature);
}

export async function getFeaturesByTemplateId(
  db: DatabaseService,
  templateId: string
): Promise<Feature[]> {
  const rows = await db.all<FeatureRow>(`
    SELECT * FROM features
    WHERE template_id = ?
    ORDER BY created_at DESC
  `, [templateId]);
  return rows.map(rowToFeature);
}

export async function searchFeatures(db: DatabaseService, query: string): Promise<Feature[]> {
  const searchTerm = `%${query}%`;
  const rows = await db.all<FeatureRow>(`
    SELECT * FROM features
    WHERE name LIKE ? OR description LIKE ? OR tags LIKE ?
    ORDER BY created_at DESC
  `, [searchTerm, searchTerm, searchTerm]);
  return rows.map(rowToFeature);
}

export async function createFeature(
  db: DatabaseService,
  input: CreateFeatureInput
): Promise<Feature> {
  const id = generateId();
  const now = toISOString(new Date());

  await db.run(`
    INSERT INTO features (
      id, name, description, geometry_type, geometry,
      template_id, tags, properties, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id,
    input.name,
    input.description || null,
    input.geometryType,
    JSON.stringify(input.geometry),
    input.templateId || null,
    JSON.stringify(input.tags || []),
    JSON.stringify(input.properties || {}),
    now,
    now,
  ]);

  const feature = await getFeatureById(db, id);
  if (!feature) throw new Error('Failed to create feature');
  return feature;
}

export async function updateFeature(
  db: DatabaseService,
  id: string,
  input: UpdateFeatureInput
): Promise<Feature> {
  const existing = await getFeatureById(db, id);
  if (!existing) throw new Error('Feature not found');

  const now = toISOString(new Date());

  await db.run(`
    UPDATE features SET
      name = COALESCE(?, name),
      description = COALESCE(?, description),
      geometry = COALESCE(?, geometry),
      tags = COALESCE(?, tags),
      properties = COALESCE(?, properties),
      updated_at = ?
    WHERE id = ?
  `, [
    input.name || null,
    input.description || null,
    input.geometry ? JSON.stringify(input.geometry) : null,
    input.tags ? JSON.stringify(input.tags) : null,
    input.properties ? JSON.stringify(input.properties) : null,
    now,
    id,
  ]);

  const feature = await getFeatureById(db, id);
  if (!feature) throw new Error('Failed to update feature');
  return feature;
}

export async function deleteFeature(db: DatabaseService, id: string): Promise<void> {
  await db.run('DELETE FROM features WHERE id = ?', [id]);
}

export async function getFeatureCount(db: DatabaseService): Promise<number> {
  const result = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM features');
  return result?.count || 0;
}

export async function getAllTags(db: DatabaseService): Promise<string[]> {
  const rows = await db.all<{ tags: string }>('SELECT DISTINCT tags FROM features WHERE tags != "[]"');
  const tagSet = new Set<string>();

  for (const row of rows) {
    const tags = JSON.parse(row.tags) as string[];
    tags.forEach(tag => tagSet.add(tag));
  }

  return Array.from(tagSet).sort();
}
