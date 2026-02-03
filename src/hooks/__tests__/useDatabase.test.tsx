import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

// Create mock database instance
const mockDbInstance = {
  initialize: vi.fn().mockResolvedValue(undefined),
  query: vi.fn().mockResolvedValue({ values: [] }),
  run: vi.fn().mockResolvedValue({ changes: { changes: 0 } }),
  execute: vi.fn().mockResolvedValue({ columns: [], values: [] }),
};

// Mock the database service BEFORE importing hooks
vi.mock('../../services/database', () => ({
  getDatabase: vi.fn(),
  getDatabaseSync: vi.fn(),
}));

// Import after mocks are set up
import { useDatabase, useDatabaseQuery } from '../useDatabase';
import { getDatabase, getDatabaseSync } from '../../services/database';

const mockGetDatabase = vi.mocked(getDatabase);
const mockGetDatabaseSync = vi.mocked(getDatabaseSync);

describe('useDatabase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDatabaseSync.mockReturnValue(null);
  });

  describe('successful initialization', () => {
    it('returns isReady=false initially when no sync database exists', () => {
      mockGetDatabase.mockReturnValue(new Promise(() => {}));

      const { result } = renderHook(() => useDatabase());

      expect(result.current.isReady).toBe(false);
      expect(result.current.db).toBe(null);
      expect(result.current.error).toBe(null);
    });

    it('returns isReady=true when sync database already exists', () => {
      mockGetDatabaseSync.mockReturnValue(mockDbInstance as any);

      const { result } = renderHook(() => useDatabase());

      expect(result.current.isReady).toBe(true);
      expect(result.current.db).toBe(mockDbInstance);
      expect(result.current.error).toBe(null);
    });

    it('transitions to ready state after getDatabase resolves', async () => {
      mockGetDatabase.mockResolvedValue(mockDbInstance as any);

      const { result } = renderHook(() => useDatabase());

      expect(result.current.isReady).toBe(false);

      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });

      expect(result.current.db).toBe(mockDbInstance);
      expect(result.current.error).toBe(null);
    });

    it('does not attempt to initialize if db already exists', async () => {
      mockGetDatabaseSync.mockReturnValue(mockDbInstance as any);

      renderHook(() => useDatabase());

      // Wait a tick to ensure useEffect has run
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(mockGetDatabase).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('handles Error object rejection', async () => {
      mockGetDatabase.mockRejectedValue(new Error('Database connection failed'));

      const { result } = renderHook(() => useDatabase());

      await waitFor(() => {
        expect(result.current.error).toBe('Database connection failed');
      });

      expect(result.current.isReady).toBe(false);
      expect(result.current.db).toBe(null);
    });

    it('handles null rejection value gracefully', async () => {
      mockGetDatabase.mockRejectedValue(null);

      const { result } = renderHook(() => useDatabase());

      await waitFor(() => {
        expect(result.current.error).toBe('Unknown error');
      });

      expect(result.current.isReady).toBe(false);
      expect(result.current.db).toBe(null);
    });

    it('handles undefined rejection value gracefully', async () => {
      mockGetDatabase.mockRejectedValue(undefined);

      const { result } = renderHook(() => useDatabase());

      await waitFor(() => {
        expect(result.current.error).toBe('Unknown error');
      });

      expect(result.current.isReady).toBe(false);
      expect(result.current.db).toBe(null);
    });

    it('handles string rejection value gracefully', async () => {
      mockGetDatabase.mockRejectedValue('Connection timeout');

      const { result } = renderHook(() => useDatabase());

      await waitFor(() => {
        expect(result.current.error).toBe('Connection timeout');
      });

      expect(result.current.isReady).toBe(false);
      expect(result.current.db).toBe(null);
    });

    it('handles number rejection value gracefully', async () => {
      mockGetDatabase.mockRejectedValue(500);

      const { result } = renderHook(() => useDatabase());

      await waitFor(() => {
        expect(result.current.error).toBe('500');
      });

      expect(result.current.isReady).toBe(false);
      expect(result.current.db).toBe(null);
    });
  });

  describe('cleanup', () => {
    it('ignores state updates after unmount', async () => {
      let resolvePromise: (value: any) => void;
      const promise = new Promise(resolve => {
        resolvePromise = resolve;
      });
      mockGetDatabase.mockReturnValue(promise);

      const { result, unmount } = renderHook(() => useDatabase());

      expect(result.current.isReady).toBe(false);

      unmount();

      // Resolve after unmount - should not cause errors
      resolvePromise!(mockDbInstance);

      // Wait a tick to ensure async operations complete
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // No error should be thrown - this test passes if no errors occur
    });
  });
});

describe('useDatabaseQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // For useDatabaseQuery tests, we need the database to be ready
    mockGetDatabaseSync.mockReturnValue(mockDbInstance as any);
  });

  describe('successful queries', () => {
    it('executes query when database is ready', async () => {
      const mockData = [{ id: 1, name: 'test' }];
      const queryFn = vi.fn().mockResolvedValue(mockData);

      const { result } = renderHook(() => useDatabaseQuery(queryFn));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockData);
      expect(result.current.error).toBe(null);
      expect(queryFn).toHaveBeenCalledWith(mockDbInstance);
    });

    it('refetch re-executes query', async () => {
      const mockData = [{ id: 1 }];
      const queryFn = vi.fn().mockResolvedValue(mockData);

      const { result } = renderHook(() => useDatabaseQuery(queryFn));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(queryFn).toHaveBeenCalledTimes(1);

      await act(async () => {
        result.current.refetch();
      });

      await waitFor(() => {
        expect(queryFn).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('error handling', () => {
    it('handles Error object from query', async () => {
      const queryFn = vi.fn().mockRejectedValue(new Error('Query failed'));

      const { result } = renderHook(() => useDatabaseQuery(queryFn));

      await waitFor(() => {
        expect(result.current.error).toBe('Query failed');
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBe(null);
    });

    it('handles null rejection from query gracefully', async () => {
      const queryFn = vi.fn().mockRejectedValue(null);

      const { result } = renderHook(() => useDatabaseQuery(queryFn));

      await waitFor(() => {
        expect(result.current.error).toBe('Unknown error');
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBe(null);
    });

    it('handles undefined rejection from query gracefully', async () => {
      const queryFn = vi.fn().mockRejectedValue(undefined);

      const { result } = renderHook(() => useDatabaseQuery(queryFn));

      await waitFor(() => {
        expect(result.current.error).toBe('Unknown error');
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBe(null);
    });

    it('handles string rejection from query gracefully', async () => {
      const queryFn = vi.fn().mockRejectedValue('SQL syntax error');

      const { result } = renderHook(() => useDatabaseQuery(queryFn));

      await waitFor(() => {
        expect(result.current.error).toBe('SQL syntax error');
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBe(null);
    });

    it('clears error on successful refetch', async () => {
      const queryFn = vi.fn()
        .mockRejectedValueOnce(new Error('First call failed'))
        .mockResolvedValueOnce([{ id: 1 }]);

      const { result } = renderHook(() => useDatabaseQuery(queryFn));

      await waitFor(() => {
        expect(result.current.error).toBe('First call failed');
      });

      await act(async () => {
        result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.error).toBe(null);
        expect(result.current.data).toEqual([{ id: 1 }]);
      });
    });
  });

  describe('when database is not ready', () => {
    it('does not execute query when db is null', async () => {
      mockGetDatabaseSync.mockReturnValue(null);
      mockGetDatabase.mockReturnValue(new Promise(() => {})); // Never resolves

      const queryFn = vi.fn().mockResolvedValue([]);

      const { result } = renderHook(() => useDatabaseQuery(queryFn));

      // Wait a tick
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      expect(queryFn).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(true);
    });
  });
});
