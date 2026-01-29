import { create } from 'zustand';
import type { Feature, CreateFeatureInput, UpdateFeatureInput } from '@/types';
import { getDatabase } from '@/services/database';
import * as queries from '@/services/database/queries';

interface FeatureState {
  features: Feature[];
  selectedFeatureId: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadFeatures: () => Promise<void>;
  selectFeature: (id: string | null) => void;
  createFeature: (input: CreateFeatureInput) => Promise<Feature>;
  updateFeature: (id: string, input: UpdateFeatureInput) => Promise<Feature>;
  deleteFeature: (id: string) => Promise<void>;
  getFeatureById: (id: string) => Feature | undefined;
}

export const useFeatureStore = create<FeatureState>((set, get) => ({
  features: [],
  selectedFeatureId: null,
  isLoading: false,
  error: null,

  loadFeatures: async () => {
    set({ isLoading: true, error: null });
    try {
      const db = await getDatabase();
      const features = await queries.getAllFeatures(db);
      set({ features, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  selectFeature: (id) => {
    set({ selectedFeatureId: id });
  },

  createFeature: async (input) => {
    set({ isLoading: true, error: null });
    try {
      const db = await getDatabase();
      const feature = await queries.createFeature(db, input);
      set((state) => ({
        features: [feature, ...state.features],
        isLoading: false,
      }));
      return feature;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  updateFeature: async (id, input) => {
    set({ isLoading: true, error: null });
    try {
      const db = await getDatabase();
      const feature = await queries.updateFeature(db, id, input);
      set((state) => ({
        features: state.features.map((f) => (f.id === id ? feature : f)),
        isLoading: false,
      }));
      return feature;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  deleteFeature: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const db = await getDatabase();
      await queries.deleteFeature(db, id);
      set((state) => ({
        features: state.features.filter((f) => f.id !== id),
        selectedFeatureId: state.selectedFeatureId === id ? null : state.selectedFeatureId,
        isLoading: false,
      }));
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  getFeatureById: (id) => {
    return get().features.find((f) => f.id === id);
  },
}));
