import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import { BaseDatabaseService, QueryResult, Migration } from './DatabaseService';
import { migrations } from './migrations';

const DB_NAME = 'landmark-db';
const DB_STORE = 'database';

export class WebDatabase extends BaseDatabaseService {
  private db: SqlJsDatabase | null = null;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    const SQL = await initSqlJs({
      locateFile: (file: string) => `https://sql.js.org/dist/${file}`
    });

    const savedData = await this.loadFromIndexedDB();
    if (savedData) {
      this.db = new SQL.Database(savedData);
    } else {
      this.db = new SQL.Database();
    }

    await this.runMigrations();
    this.initialized = true;
  }

  async execute(sql: string, params?: unknown[]): Promise<QueryResult> {
    this.ensureInitialized();
    try {
      const results = this.db!.exec(sql, params as (string | number | Uint8Array | null)[]);
      if (results.length === 0) {
        return { columns: [], values: [] };
      }
      return {
        columns: results[0].columns,
        values: results[0].values as unknown[][]
      };
    } catch (error) {
      console.error('SQL Error:', sql, params, error);
      throw error;
    }
  }

  async run(sql: string, params?: unknown[]): Promise<void> {
    this.ensureInitialized();
    try {
      this.db!.run(sql, params as (string | number | Uint8Array | null)[]);
      await this.persist();
    } catch (error) {
      console.error('SQL Error:', sql, params, error);
      throw error;
    }
  }

  async exportDatabase(): Promise<Uint8Array> {
    this.ensureInitialized();
    return this.db!.export();
  }

  async importDatabase(data: Uint8Array): Promise<void> {
    const SQL = await initSqlJs({
      locateFile: (file: string) => `https://sql.js.org/dist/${file}`
    });
    this.db = new SQL.Database(data);
    await this.persist();
    this.initialized = true;
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.persist();
      this.db.close();
      this.db = null;
      this.initialized = false;
    }
  }

  private async persist(): Promise<void> {
    if (!this.db) return;
    const data = this.db.export();
    await this.saveToIndexedDB(new Uint8Array(data));
  }

  private async loadFromIndexedDB(): Promise<Uint8Array | null> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);

      request.onerror = () => reject(request.error);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(DB_STORE)) {
          db.createObjectStore(DB_STORE);
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction(DB_STORE, 'readonly');
        const store = tx.objectStore(DB_STORE);
        const getRequest = store.get('data');

        getRequest.onsuccess = () => {
          db.close();
          resolve(getRequest.result || null);
        };

        getRequest.onerror = () => {
          db.close();
          reject(getRequest.error);
        };
      };
    });
  }

  private async saveToIndexedDB(data: Uint8Array): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);

      request.onerror = () => reject(request.error);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(DB_STORE)) {
          db.createObjectStore(DB_STORE);
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction(DB_STORE, 'readwrite');
        const store = tx.objectStore(DB_STORE);
        store.put(data, 'data');

        tx.oncomplete = () => {
          db.close();
          resolve();
        };

        tx.onerror = () => {
          db.close();
          reject(tx.error);
        };
      };
    });
  }

  private async runMigrations(): Promise<void> {
    // Create schema_version table if not exists
    this.db!.run(`
      CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER PRIMARY KEY,
        applied_at TEXT NOT NULL DEFAULT (datetime('now')),
        description TEXT
      )
    `);

    // Get current version
    const result = this.db!.exec('SELECT MAX(version) as version FROM schema_version');
    const currentVersion = result.length > 0 && result[0].values[0][0]
      ? (result[0].values[0][0] as number)
      : 0;

    // Apply pending migrations
    for (const migration of migrations) {
      if (migration.version > currentVersion) {
        console.log(`Applying migration ${migration.version}: ${migration.description}`);
        this.db!.run(migration.up);
        this.db!.run(
          'INSERT INTO schema_version (version, description) VALUES (?, ?)',
          [migration.version, migration.description]
        );
      }
    }

    await this.persist();
  }
}
