import { create } from 'zustand';
import type { Asset, CreateAssetInput, UpdateAssetInput } from '@/types';
import { getDatabase } from '@/services/database';
import * as queries from '@/services/database/queries';

interface AssetState {
  assets: Asset[];
  isLoading: boolean;
  error: string | null;

  loadAssets: () => Promise<void>;
  createAsset: (input: CreateAssetInput) => Promise<Asset>;
  updateAsset: (id: string, input: UpdateAssetInput) => Promise<Asset>;
  deleteAsset: (id: string) => Promise<void>;
  getAssetById: (id: string) => Asset | undefined;
}

export const useAssetStore = create<AssetState>((set, get) => ({
  assets: [],
  isLoading: false,
  error: null,

  loadAssets: async () => {
    set({ isLoading: true, error: null });
    try {
      const db = await getDatabase();
      const assets = await queries.getAllAssets(db);
      set({ assets, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  createAsset: async (input) => {
    set({ isLoading: true, error: null });
    try {
      const db = await getDatabase();
      const asset = await queries.createAsset(db, input);
      set((state) => ({ assets: [asset, ...state.assets], isLoading: false }));
      return asset;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  updateAsset: async (id, input) => {
    set({ isLoading: true, error: null });
    try {
      const db = await getDatabase();
      const asset = await queries.updateAsset(db, id, input);
      set((state) => ({
        assets: state.assets.map((a) => (a.id === id ? asset : a)),
        isLoading: false,
      }));
      return asset;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  deleteAsset: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const db = await getDatabase();
      await queries.deleteAsset(db, id);
      set((state) => ({
        assets: state.assets.filter((a) => a.id !== id),
        isLoading: false,
      }));
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  getAssetById: (id) => get().assets.find((a) => a.id === id),
}));
