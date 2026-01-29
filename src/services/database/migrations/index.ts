import type { Migration } from '../DatabaseService';

export const migrations: Migration[] = [
  {
    version: 1,
    description: 'Initial schema',
    up: `
      -- Features table
      CREATE TABLE IF NOT EXISTS features (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        geometry_type TEXT NOT NULL CHECK (geometry_type IN ('Point', 'LineString', 'Polygon')),
        geometry TEXT NOT NULL,
        template_id TEXT,
        tags TEXT DEFAULT '[]',
        properties TEXT DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_features_geometry_type ON features(geometry_type);
      CREATE INDEX IF NOT EXISTS idx_features_created_at ON features(created_at);
      CREATE INDEX IF NOT EXISTS idx_features_template_id ON features(template_id);

      -- Observations table
      CREATE TABLE IF NOT EXISTS observations (
        id TEXT PRIMARY KEY,
        feature_id TEXT NOT NULL,
        notes TEXT,
        tags TEXT DEFAULT '[]',
        recorded_at TEXT NOT NULL DEFAULT (datetime('now')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        observer_latitude REAL,
        observer_longitude REAL,
        observer_accuracy REAL,
        FOREIGN KEY (feature_id) REFERENCES features(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_observations_feature_id ON observations(feature_id);
      CREATE INDEX IF NOT EXISTS idx_observations_recorded_at ON observations(recorded_at);

      -- Measurements table
      CREATE TABLE IF NOT EXISTS measurements (
        id TEXT PRIMARY KEY,
        feature_id TEXT NOT NULL,
        metric TEXT NOT NULL,
        value REAL NOT NULL,
        unit TEXT NOT NULL,
        method TEXT NOT NULL DEFAULT 'estimated' CHECK (method IN ('estimated', 'measured', 'derived')),
        accuracy REAL,
        confidence TEXT CHECK (confidence IS NULL OR confidence IN ('low', 'medium', 'high')),
        notes TEXT,
        recorded_at TEXT NOT NULL DEFAULT (datetime('now')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (feature_id) REFERENCES features(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_measurements_feature_id ON measurements(feature_id);
      CREATE INDEX IF NOT EXISTS idx_measurements_recorded_at ON measurements(recorded_at);
      CREATE INDEX IF NOT EXISTS idx_measurements_metric ON measurements(metric);

      -- Tasks table
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        feature_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'active', 'done', 'abandoned')),
        priority INTEGER,
        due_date TEXT,
        tags TEXT DEFAULT '[]',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        completed_at TEXT,
        FOREIGN KEY (feature_id) REFERENCES features(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_tasks_feature_id ON tasks(feature_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
      CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
      CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);

      -- Templates table
      CREATE TABLE IF NOT EXISTS templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        icon TEXT,
        is_builtin INTEGER NOT NULL DEFAULT 0,
        schema TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      -- Media table
      CREATE TABLE IF NOT EXISTS media (
        id TEXT PRIMARY KEY,
        feature_id TEXT,
        observation_id TEXT,
        type TEXT NOT NULL CHECK (type IN ('photo', 'audio', 'video', 'document')),
        filename TEXT NOT NULL,
        storage_path TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        size_bytes INTEGER,
        width INTEGER,
        height INTEGER,
        duration_seconds REAL,
        caption TEXT,
        recorded_at TEXT NOT NULL DEFAULT (datetime('now')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        latitude REAL,
        longitude REAL,
        accuracy REAL,
        FOREIGN KEY (feature_id) REFERENCES features(id) ON DELETE SET NULL,
        FOREIGN KEY (observation_id) REFERENCES observations(id) ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS idx_media_feature_id ON media(feature_id);
      CREATE INDEX IF NOT EXISTS idx_media_observation_id ON media(observation_id);
      CREATE INDEX IF NOT EXISTS idx_media_type ON media(type);

      -- Settings table
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      -- Default settings
      INSERT OR IGNORE INTO settings (key, value) VALUES
        ('map_center', '{"lat": 0, "lng": 0}'),
        ('map_zoom', '13'),
        ('basemap', 'osm'),
        ('units_system', 'metric');
    `
  }
];
