import { useState, useEffect, useCallback } from 'react';
import { getDatabase, getDatabaseSync, type DatabaseService } from '@/services/database';

interface UseDatabaseResult {
  db: DatabaseService | null;
  isReady: boolean;
  error: string | null;
}

export function useDatabase(): UseDatabaseResult {
  const [db, setDb] = useState<DatabaseService | null>(getDatabaseSync());
  const [isReady, setIsReady] = useState(!!getDatabaseSync());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (db) return;

    let cancelled = false;

    async function init() {
      try {
        const database = await getDatabase();
        if (!cancelled) {
          setDb(database);
          setIsReady(true);
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : String(err ?? 'Unknown error');
          setError(message);
        }
      }
    }

    init();

    return () => {
      cancelled = true;
    };
  }, [db]);

  return { db, isReady, error };
}

export function useDatabaseQuery<T>(
  query: (db: DatabaseService) => Promise<T>,
  deps: unknown[] = []
): { data: T | null; isLoading: boolean; error: string | null; refetch: () => void } {
  const { db, isReady } = useDatabase();
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!db || !isReady) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await query(db);
      setData(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err ?? 'Unknown error');
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [db, isReady, ...deps]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, isLoading, error, refetch: fetch };
}
