import { useEffect } from 'react';
import { useFeatureStore } from '@/store';
import { useDatabase } from './useDatabase';

console.log('[useFeatures.ts] Module loaded');

export function useFeatures() {
  const { isReady } = useDatabase();
  const store = useFeatureStore();

  console.log('[useFeatures] Hook called, isReady:', isReady, 'features.length:', store.features.length, 'isLoading:', store.isLoading);

  useEffect(() => {
    if (isReady && store.features.length === 0 && !store.isLoading) {
      console.log('[useFeatures] Loading features...');
      store.loadFeatures();
    }
  }, [isReady, store.features.length, store.isLoading]);

  return store;
}

export function useFeature(id: string | null) {
  const { features, isLoading, error } = useFeatureStore();

  const feature = id ? features.find((f) => f.id === id) : null;

  return {
    feature,
    isLoading,
    error,
  };
}

export function useSelectedFeature() {
  const { features, selectedFeatureId } = useFeatureStore();

  return selectedFeatureId ? features.find((f) => f.id === selectedFeatureId) : null;
}
