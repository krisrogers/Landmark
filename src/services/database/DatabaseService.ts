export interface QueryResult {
  columns: string[];
  values: unknown[][];
}

export interface DatabaseService {
  initialize(): Promise<void>;
  execute(sql: string, params?: unknown[]): Promise<QueryResult>;
  run(sql: string, params?: unknown[]): Promise<void>;
  get<T>(sql: string, params?: unknown[]): Promise<T | null>;
  all<T>(sql: string, params?: unknown[]): Promise<T[]>;
  transaction<T>(fn: () => Promise<T>): Promise<T>;
  exportDatabase(): Promise<Uint8Array>;
  importDatabase(data: Uint8Array): Promise<void>;
  close(): Promise<void>;
}

export interface Migration {
  version: number;
  description: string;
  up: string;
}

export abstract class BaseDatabaseService implements DatabaseService {
  protected initialized = false;

  abstract initialize(): Promise<void>;
  abstract execute(sql: string, params?: unknown[]): Promise<QueryResult>;
  abstract run(sql: string, params?: unknown[]): Promise<void>;
  abstract exportDatabase(): Promise<Uint8Array>;
  abstract importDatabase(data: Uint8Array): Promise<void>;
  abstract close(): Promise<void>;

  async get<T>(sql: string, params?: unknown[]): Promise<T | null> {
    const result = await this.execute(sql, params);
    if (result.values.length === 0) return null;
    return this.rowToObject<T>(result.columns, result.values[0]);
  }

  async all<T>(sql: string, params?: unknown[]): Promise<T[]> {
    const result = await this.execute(sql, params);
    return result.values.map(row => this.rowToObject<T>(result.columns, row));
  }

  async transaction<T>(fn: () => Promise<T>): Promise<T> {
    await this.run('BEGIN TRANSACTION');
    try {
      const result = await fn();
      await this.run('COMMIT');
      return result;
    } catch (error) {
      await this.run('ROLLBACK');
      throw error;
    }
  }

  protected rowToObject<T>(columns: string[], values: unknown[]): T {
    const obj: Record<string, unknown> = {};
    columns.forEach((col, i) => {
      obj[col] = values[i];
    });
    return obj as T;
  }

  protected ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
  }
}
