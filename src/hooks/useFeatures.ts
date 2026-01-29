import { useEffect } from 'react';
import { useFeatureStore } from '@/store';
import { useDatabase } from './useDatabase';

export function useFeatures() {
  const { isReady } = useDatabase();
  const store = useFeatureStore();

  useEffect(() => {
    if (isReady && store.features.length === 0 && !store.isLoading) {
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
