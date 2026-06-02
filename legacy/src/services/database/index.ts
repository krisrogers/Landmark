import { DatabaseService } from './DatabaseService';
import { WebDatabase } from './WebDatabase';
import { NativeDatabase } from './NativeDatabase';
import { isNative } from '@/utils/platform';

let dbInstance: DatabaseService | null = null;

export async function getDatabase(): Promise<DatabaseService> {
  if (dbInstance) {
    return dbInstance;
  }

  if (isNative()) {
    dbInstance = new NativeDatabase();
  } else {
    dbInstance = new WebDatabase();
  }

  await dbInstance.initialize();
  return dbInstance;
}

export function getDatabaseSync(): DatabaseService | null {
  return dbInstance;
}

export type { DatabaseService, QueryResult } from './DatabaseService';
export { WebDatabase } from './WebDatabase';
export { NativeDatabase } from './NativeDatabase';
