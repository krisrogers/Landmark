import { useEffect, useRef } from 'react';
import { useFeatureStore } from '@/store';
import { useDatabase } from './useDatabase';

console.log('[useFeatures.ts] Module loaded');

export function useFeatures() {
  const { isReady } = useDatabase();
  const store = useFeatureStore();
  const hasLoadedRef = useRef(false);

  console.log('[useFeatures] Hook called, isReady:', isReady, 'features.length:', store.features.length, 'isLoading:', store.isLoading, 'hasLoaded:', hasLoadedRef.current);

  useEffect(() => {
    if (isReady && !hasLoadedRef.current && !store.isLoading) {
      console.log('[useFeatures] Loading features...');
      hasLoadedRef.current = true;
      store.loadFeatures();
    }
  }, [isReady, store.isLoading]);

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
