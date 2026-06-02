import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

// Mock useDatabase
vi.mock('../useDatabase', () => ({
  useDatabase: vi.fn(),
}));

// Mock the feature store
const mockLoadFeatures = vi.fn();
const mockFeatureStore = {
  features: [] as any[],
  selectedFeatureId: null,
  isLoading: false,
  error: null,
  loadFeatures: mockLoadFeatures,
  selectFeature: vi.fn(),
  createFeature: vi.fn(),
  updateFeature: vi.fn(),
  deleteFeature: vi.fn(),
  getFeatureById: vi.fn(),
};

vi.mock('@/store', () => ({
  useFeatureStore: vi.fn(() => mockFeatureStore),
}));

import { useFeatures } from '../useFeatures';
import { useDatabase } from '../useDatabase';
import { useFeatureStore } from '@/store';

const mockUseDatabase = vi.mocked(useDatabase);
const mockUseFeatureStore = vi.mocked(useFeatureStore);

describe('useFeatures', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store state
    mockFeatureStore.features = [];
    mockFeatureStore.isLoading = false;
    mockFeatureStore.error = null;
    mockUseFeatureStore.mockReturnValue(mockFeatureStore);
  });

  describe('initial loading', () => {
    it('does not load features when database is not ready', async () => {
      mockUseDatabase.mockReturnValue({ db: null, isReady: false, error: null });

      renderHook(() => useFeatures());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      expect(mockLoadFeatures).not.toHaveBeenCalled();
    });

    it('loads features when database is ready', async () => {
      mockUseDatabase.mockReturnValue({ db: {} as any, isReady: true, error: null });

      renderHook(() => useFeatures());

      await waitFor(() => {
        expect(mockLoadFeatures).toHaveBeenCalledTimes(1);
      });
    });

    it('only loads features once even when features array remains empty', async () => {
      mockUseDatabase.mockReturnValue({ db: {} as any, isReady: true, error: null });

      // Simulate the store behavior where isLoading toggles but features stay empty
      let callCount = 0;
      mockLoadFeatures.mockImplementation(() => {
        callCount++;
        // Simulate async loading cycle
        mockFeatureStore.isLoading = true;
        mockUseFeatureStore.mockReturnValue({ ...mockFeatureStore });

        setTimeout(() => {
          mockFeatureStore.isLoading = false;
          mockFeatureStore.features = []; // Features remain empty
          mockUseFeatureStore.mockReturnValue({ ...mockFeatureStore });
        }, 10);
      });

      const { rerender } = renderHook(() => useFeatures());

      // Wait for initial load
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Force multiple rerenders to simulate React's behavior
      rerender();
      rerender();
      rerender();

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Should only have been called once, not repeatedly
      expect(mockLoadFeatures).toHaveBeenCalledTimes(1);
    });

    it('does not load features when already loading', async () => {
      mockUseDatabase.mockReturnValue({ db: {} as any, isReady: true, error: null });
      mockFeatureStore.isLoading = true;
      mockUseFeatureStore.mockReturnValue({ ...mockFeatureStore });

      renderHook(() => useFeatures());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      expect(mockLoadFeatures).not.toHaveBeenCalled();
    });
  });

  describe('return value', () => {
    it('returns the feature store', () => {
      mockUseDatabase.mockReturnValue({ db: {} as any, isReady: true, error: null });
      mockFeatureStore.features = [{ id: '1', name: 'Test' }] as any[];
      mockUseFeatureStore.mockReturnValue({ ...mockFeatureStore });

      const { result } = renderHook(() => useFeatures());

      expect(result.current.features).toEqual([{ id: '1', name: 'Test' }]);
      expect(result.current.isLoading).toBe(false);
    });
  });
});
