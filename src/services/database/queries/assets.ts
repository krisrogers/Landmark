import type { DatabaseService } from '../DatabaseService';
import type { Asset, CreateAssetInput, UpdateAssetInput, PointGeometry } from '@/types';
import { generateId } from '@/utils/uuid';
import { toISOString, fromISOString } from '@/utils/datetime';

interface AssetRow {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  location: string | null;
  place_id: string | null;
  tags: string;
  properties: string;
  created_at: string;
  updated_at: string;
}

function rowToAsset(row: AssetRow): Asset {
  return {
    id: row.id,
    name: row.name,
    description: row.description || undefined,
    category: row.category || undefined,
    location: row.location ? (JSON.parse(row.location) as PointGeometry) : undefined,
    placeId: row.place_id || undefined,
    tags: JSON.parse(row.tags || '[]'),
    properties: JSON.parse(row.properties || '{}'),
    createdAt: fromISOString(row.created_at),
    updatedAt: fromISOString(row.updated_at),
  };
}

export async function getAllAssets(db: DatabaseService): Promise<Asset[]> {
  const rows = await db.all<AssetRow>('SELECT * FROM assets ORDER BY created_at DESC');
  return rows.map(rowToAsset);
}

export async function getAssetById(db: DatabaseService, id: string): Promise<Asset | null> {
  const row = await db.get<AssetRow>('SELECT * FROM assets WHERE id = ?', [id]);
  return row ? rowToAsset(row) : null;
}

export async function getAssetsByPlaceId(
  db: DatabaseService,
  placeId: string
): Promise<Asset[]> {
  const rows = await db.all<AssetRow>(
    'SELECT * FROM assets WHERE place_id = ? ORDER BY created_at DESC',
    [placeId]
  );
  return rows.map(rowToAsset);
}

export async function getAssetsByTag(db: DatabaseService, tag: string): Promise<Asset[]> {
  const rows = await db.all<AssetRow>(
    'SELECT * FROM assets WHERE tags LIKE ? ORDER BY created_at DESC',
    [`%"${tag}"%`]
  );
  return rows.map(rowToAsset);
}

export async function createAsset(
  db: DatabaseService,
  input: CreateAssetInput
): Promise<Asset> {
  const id = generateId();
  const now = toISOString(new Date());

  await db.run(
    `INSERT INTO assets (
      id, name, description, category, location, place_id, tags, properties, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.name,
      input.description || null,
      input.category || null,
      input.location ? JSON.stringify(input.location) : null,
      input.placeId || null,
      JSON.stringify(input.tags || []),
      JSON.stringify(input.properties || {}),
      now,
      now,
    ]
  );

  const asset = await getAssetById(db, id);
  if (!asset) throw new Error('Failed to create asset');
  return asset;
}

export async function updateAsset(
  db: DatabaseService,
  id: string,
  input: UpdateAssetInput
): Promise<Asset> {
  const existing = await getAssetById(db, id);
  if (!existing) throw new Error('Asset not found');

  const now = toISOString(new Date());
  const sets: string[] = [];
  const params: unknown[] = [];
  const set = (col: string, val: unknown) => {
    sets.push(`${col} = ?`);
    params.push(val);
  };

  if (input.name !== undefined) set('name', input.name);
  if (input.description !== undefined) set('description', input.description ?? null);
  if (input.category !== undefined) set('category', input.category ?? null);
  if (input.location !== undefined)
    set('location', input.location ? JSON.stringify(input.location) : null);
  if (input.placeId !== undefined) set('place_id', input.placeId ?? null);
  if (input.tags !== undefined) set('tags', JSON.stringify(input.tags));
  if (input.properties !== undefined) set('properties', JSON.stringify(input.properties));

  set('updated_at', now);
  params.push(id);

  await db.run(`UPDATE assets SET ${sets.join(', ')} WHERE id = ?`, params);

  const asset = await getAssetById(db, id);
  if (!asset) throw new Error('Failed to update asset');
  return asset;
}

export async function deleteAsset(db: DatabaseService, id: string): Promise<void> {
  await db.run('DELETE FROM assets WHERE id = ?', [id]);
}

export async function getAssetCount(db: DatabaseService): Promise<number> {
  const result = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM assets');
  return result?.count || 0;
}
