/**
 * SQLite setup and migrations.
 *
 * Schema is designed to be sync-ready for a future cloud backend:
 * - UUID primary keys (no autoincrement ids to reconcile)
 * - created_at / updated_at timestamps on every row
 * - soft deletes (deleted_at) so deletions can propagate through sync
 */
import * as SQLite from 'expo-sqlite';

const DATABASE_NAME = 'landmark.db';

const MIGRATIONS: string[] = [
  // v1 – initial schema
  `
  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
  );

  CREATE TABLE IF NOT EXISTS features (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    geometry_type TEXT NOT NULL CHECK (geometry_type IN ('Point', 'LineString', 'Polygon')),
    geometry_json TEXT NOT NULL,
    category_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
  );

  CREATE TABLE IF NOT EXISTS photos (
    id TEXT PRIMARY KEY,
    feature_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    width INTEGER,
    height INTEGER,
    created_at TEXT NOT NULL,
    deleted_at TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_features_category ON features (category_id);
  CREATE INDEX IF NOT EXISTS idx_photos_feature ON photos (feature_id);
  `,
];

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/** Opens (and migrates) the database. Safe to call repeatedly. */
export function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = openAndMigrate();
  }
  return dbPromise;
}

async function openAndMigrate(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = row?.user_version ?? 0;

  for (let v = currentVersion; v < MIGRATIONS.length; v++) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(MIGRATIONS[v]);
      await db.execAsync(`PRAGMA user_version = ${v + 1}`);
    });
  }

  return db;
}

/** Test-only: reset the cached connection. */
export function resetDatabaseCache(): void {
  dbPromise = null;
}
