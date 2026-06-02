/**
 * Holds a geometry that has just been captured (a dropped pin or a walked
 * path/area) while the user fills in the save form. Cleared after save or
 * cancel.
 */
import { create } from 'zustand';

import type { FeatureGeometry } from '@/lib/geo';

interface CaptureState {
  draftGeometry: FeatureGeometry | null;
  setDraftGeometry: (geometry: FeatureGeometry) => void;
  clearDraft: () => void;
}

export const useCaptureStore = create<CaptureState>((set) => ({
  draftGeometry: null,
  setDraftGeometry: (geometry) => set({ draftGeometry: geometry }),
  clearDraft: () => set({ draftGeometry: null }),
}));
