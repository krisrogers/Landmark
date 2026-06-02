/**
 * Category persistence. All reads exclude soft-deleted rows.
 */
import { getDatabase } from './database';
import { newId } from '@/lib/id';
import type { Category } from '@/lib/types';

interface CategoryRow {
  id: string;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
}

function rowToCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listCategories(): Promise<Category[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<CategoryRow>(
    'SELECT * FROM categories WHERE deleted_at IS NULL ORDER BY name COLLATE NOCASE ASC'
  );
  return rows.map(rowToCategory);
}

export async function insertCategory(name: string, color: string): Promise<Category> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const id = newId();
  await db.runAsync(
    'INSERT INTO categories (id, name, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    id,
    name,
    color,
    now,
    now
  );
  return { id, name, color, createdAt: now, updatedAt: now };
}

export async function updateCategory(id: string, name: string, color: string): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.runAsync(
    'UPDATE categories SET name = ?, color = ?, updated_at = ? WHERE id = ?',
    name,
    color,
    now,
    id
  );
}

/** Soft-deletes a category; features keep working and show as uncategorised. */
export async function softDeleteCategory(id: string): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    await db.runAsync('UPDATE categories SET deleted_at = ? WHERE id = ?', now, id);
    await db.runAsync(
      'UPDATE features SET category_id = NULL, updated_at = ? WHERE category_id = ?',
      now,
      id
    );
  });
}
