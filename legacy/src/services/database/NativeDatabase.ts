import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { Capacitor } from '@capacitor/core';
import { BaseDatabaseService, QueryResult } from './DatabaseService';
import { migrations } from './migrations';

const DB_NAME = 'landmark';

export class NativeDatabase extends BaseDatabaseService {
  private sqlite: SQLiteConnection;
  private db: SQLiteDBConnection | null = null;

  constructor() {
    super();
    this.sqlite = new SQLiteConnection(CapacitorSQLite);
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    const platform = Capacitor.getPlatform();

    if (platform === 'web') {
      throw new Error('NativeDatabase should not be used on web platform');
    }

    // Check connection consistency
    const retCC = await this.sqlite.checkConnectionsConsistency();
    const isConn = (await this.sqlite.isConnection(DB_NAME, false)).result;

    if (retCC.result && isConn) {
      this.db = await this.sqlite.retrieveConnection(DB_NAME, false);
    } else {
      this.db = await this.sqlite.createConnection(
        DB_NAME,
        false,
        'no-encryption',
        1,
        false
      );
    }

    await this.db.open();
    await this.runMigrations();
    this.initialized = true;
  }

  async execute(sql: string, params?: unknown[]): Promise<QueryResult> {
    this.ensureInitialized();

    const result = await this.db!.query(sql, params as (string | number)[]);

    if (!result.values || result.values.length === 0) {
      return { columns: [], values: [] };
    }

    // Extract columns from first row keys
    const columns = Object.keys(result.values[0]);
    const values = result.values.map(row => columns.map(col => row[col]));

    return { columns, values };
  }

  async run(sql: string, params?: unknown[]): Promise<void> {
    this.ensureInitialized();
    await this.db!.run(sql, params as (string | number)[]);
  }

  async exportDatabase(): Promise<Uint8Array> {
    this.ensureInitialized();

    // Export to JSON and convert to Uint8Array
    const exportData = await this.db!.exportToJson('full');
    const jsonString = JSON.stringify(exportData.export);
    const encoder = new TextEncoder();
    return encoder.encode(jsonString);
  }

  async importDatabase(data: Uint8Array): Promise<void> {
    const decoder = new TextDecoder();
    const jsonString = decoder.decode(data);
    const importData = JSON.parse(jsonString);

    // Use executeSet for importing data from JSON
    await (this.db as unknown as { importFromJson: (json: string) => Promise<void> }).importFromJson(JSON.stringify(importData));
    await this.runMigrations();
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      await this.sqlite.closeConnection(DB_NAME, false);
      this.db = null;
      this.initialized = false;
    }
  }

  private async runMigrations(): Promise<void> {
    // Create schema_version table if not exists
    await this.db!.execute(`
      CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER PRIMARY KEY,
        applied_at TEXT NOT NULL DEFAULT (datetime('now')),
        description TEXT
      )
    `);

    // Get current version
    const result = await this.db!.query('SELECT MAX(version) as version FROM schema_version');
    const currentVersion = result.values && result.values[0]
      ? (result.values[0].version as number) || 0
      : 0;

    // Apply pending migrations
    for (const migration of migrations) {
      if (migration.version > currentVersion) {
        console.log(`Applying migration ${migration.version}: ${migration.description}`);
        await this.db!.execute(migration.up);
        await this.db!.run(
          'INSERT INTO schema_version (version, description) VALUES (?, ?)',
          [migration.version, migration.description]
        );
      }
    }
  }
}
