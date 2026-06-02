/**
 * In-memory mirror of the database, kept in a Zustand store.
 *
 * All mutations write to SQLite first, then update the in-memory state, so
 * the UI always reflects what is actually persisted.
 */
import { create } from 'zustand';

import * as categoryRepo from '@/db/categoryRepo';
import * as featureRepo from '@/db/featureRepo';
import { deletePhotoFile } from '@/lib/photoStorage';
import type { Category, Feature, FeatureInput } from '@/lib/types';

interface DataState {
  hydrated: boolean;
  features: Feature[];
  categories: Category[];

  /** Active category filter on the map. undefined = show all. null = uncategorised only. */
  categoryFilter: string | null | undefined;

  hydrate: () => Promise<void>;

  addFeature: (input: FeatureInput, photos: featureRepo.PhotoInput[]) => Promise<Feature>;
  updateFeature: (featureId: string, update: featureRepo.FeatureUpdate) => Promise<void>;
  deleteFeature: (featureId: string) => Promise<void>;

  addCategory: (name: string, color: string) => Promise<Category>;
  updateCategory: (id: string, name: string, color: string) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;

  setCategoryFilter: (filter: string | null | undefined) => void;
}

export const useDataStore = create<DataState>((set, get) => ({
  hydrated: false,
  features: [],
  categories: [],
  categoryFilter: undefined,

  hydrate: async () => {
    const [features, categories] = await Promise.all([
      featureRepo.listFeatures(),
      categoryRepo.listCategories(),
    ]);
    set({ features, categories, hydrated: true });
  },

  addFeature: async (input, photos) => {
    const feature = await featureRepo.insertFeature(input, photos);
    set({ features: [feature, ...get().features] });
    return feature;
  },

  updateFeature: async (featureId, update) => {
    const existing = get().features.find((f) => f.id === featureId);
    await featureRepo.updateFeature(featureId, update);

    // Remove deleted photo files from disk.
    if (existing) {
      for (const photo of existing.photos) {
        if (update.removedPhotoIds.includes(photo.id)) {
          deletePhotoFile(photo.filename);
        }
      }
    }

    // Re-read from the database so photo ids/timestamps are authoritative.
    const features = await featureRepo.listFeatures();
    set({ features });
  },

  deleteFeature: async (featureId) => {
    const existing = get().features.find((f) => f.id === featureId);
    await featureRepo.softDeleteFeature(featureId);
    if (existing) {
      for (const photo of existing.photos) {
        deletePhotoFile(photo.filename);
      }
    }
    set({ features: get().features.filter((f) => f.id !== featureId) });
  },

  addCategory: async (name, color) => {
    const category = await categoryRepo.insertCategory(name, color);
    set({
      categories: [...get().categories, category].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
      ),
    });
    return category;
  },

  updateCategory: async (id, name, color) => {
    await categoryRepo.updateCategory(id, name, color);
    set({
      categories: get()
        .categories.map((c) => (c.id === id ? { ...c, name, color } : c))
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })),
    });
  },

  deleteCategory: async (id) => {
    await categoryRepo.softDeleteCategory(id);
    set({
      categories: get().categories.filter((c) => c.id !== id),
      features: get().features.map((f) =>
        f.categoryId === id ? { ...f, categoryId: null } : f
      ),
      categoryFilter: get().categoryFilter === id ? undefined : get().categoryFilter,
    });
  },

  setCategoryFilter: (filter) => set({ categoryFilter: filter }),
}));
