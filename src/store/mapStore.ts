import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FeatureGeometry } from '@/types';

export type BasemapType = 'osm' | 'satellite';
export type DrawingMode = 'none' | 'point' | 'line' | 'polygon';
export type GpsStatus = 'idle' | 'locating' | 'locked' | 'error';
/** 'denied' is terminal (needs user action); the rest are transient while a watch keeps trying. */
export type GpsErrorKind = 'denied' | 'timeout' | 'unavailable' | 'unknown';

/** A just-completed measurement awaiting save or discard. */
export interface PendingMeasure {
  geometryType: 'LineString' | 'Polygon';
  geometry: FeatureGeometry;
  length?: number; // line length, metres
  area?: number; // polygon area, m²
  perimeter?: number; // polygon perimeter, metres
}

// Shown before we know where the user is: a world overview, not blue ocean.
export const WORLD_CENTER: [number, number] = [20, 0];
export const WORLD_ZOOM = 3;

interface MapState {
  center: [number, number]; // [lat, lng]
  zoom: number;
  basemap: BasemapType;
  drawingMode: DrawingMode;
  showGpsLocation: boolean;
  gpsPosition: GeolocationPosition | null;
  gpsError: string | null;
  gpsStatus: GpsStatus;
  gpsAccuracy: number | null;
  gpsErrorKind: GpsErrorKind | null;
  visibleGeometryTypes: Set<string>;
  visibleTags: Set<string>;

  // Walk-to-trace recording ([lat, lng] points)
  isWalking: boolean;
  walkPoints: [number, number][];

  // A completed measurement awaiting save/discard.
  pendingMeasure: PendingMeasure | null;

  // Whether the capture (+) sheet is open.
  captureOpen: boolean;

  // Whether an initial map location has been established (GPS/IP/manual move).
  hasLocated: boolean;

  // Actions
  setCenter: (center: [number, number]) => void;
  setZoom: (zoom: number) => void;
  setView: (center: [number, number], zoom: number) => void;
  setBasemap: (basemap: BasemapType) => void;
  setDrawingMode: (mode: DrawingMode) => void;
  setGpsPosition: (position: GeolocationPosition | null) => void;
  setGpsError: (error: string | null, kind?: GpsErrorKind) => void;
  beginGpsRequest: () => void;
  toggleGpsLocation: () => void;
  toggleGeometryType: (type: string) => void;
  toggleTag: (tag: string) => void;
  resetFilters: () => void;
  startWalk: () => void;
  addWalkPoint: (pt: [number, number]) => void;
  clearWalk: () => void;
  setLocated: (located: boolean) => void;
  setPendingMeasure: (measure: PendingMeasure | null) => void;
  setCaptureOpen: (open: boolean) => void;
}

export const useMapStore = create<MapState>()(
  persist(
    (set) => ({
      center: WORLD_CENTER,
      zoom: WORLD_ZOOM,
      basemap: 'satellite',
      drawingMode: 'none',
      showGpsLocation: true,
      gpsPosition: null,
      gpsError: null,
      gpsStatus: 'idle',
      gpsAccuracy: null,
      gpsErrorKind: null,
      visibleGeometryTypes: new Set(['Point', 'LineString', 'Polygon']),
      visibleTags: new Set(),
      isWalking: false,
      walkPoints: [],
      hasLocated: false,
      pendingMeasure: null,
      captureOpen: false,

      setCenter: (center) => set({ center }),
      setZoom: (zoom) => set({ zoom }),
      setView: (center, zoom) => set({ center, zoom }),
      setBasemap: (basemap) => set({ basemap }),
      setDrawingMode: (drawingMode) => set({ drawingMode }),
      setGpsPosition: (gpsPosition) =>
        set({
          gpsPosition,
          gpsError: null,
          gpsStatus: 'locked',
          gpsAccuracy: gpsPosition?.coords.accuracy ?? null,
        }),
      setGpsError: (gpsError, kind = 'unknown') =>
        set((state) => {
          if (!gpsError) {
            return {
              gpsError: null,
              gpsErrorKind: null,
              gpsStatus: state.gpsPosition ? 'locked' : 'idle',
            };
          }
          // Permission denied is terminal; everything else is transient while
          // the watch keeps trying (stay "locating" until we actually get a fix).
          const status: GpsStatus =
            kind === 'denied' ? 'error' : state.gpsPosition ? 'locked' : 'locating';
          return { gpsError, gpsErrorKind: kind, gpsStatus: status };
        }),
      beginGpsRequest: () => set({ gpsStatus: 'locating', gpsError: null, gpsErrorKind: null }),
      toggleGpsLocation: () => set((state) => ({ showGpsLocation: !state.showGpsLocation })),

      toggleGeometryType: (type) =>
        set((state) => {
          const newSet = new Set(state.visibleGeometryTypes);
          if (newSet.has(type)) {
            newSet.delete(type);
          } else {
            newSet.add(type);
          }
          return { visibleGeometryTypes: newSet };
        }),

      toggleTag: (tag) =>
        set((state) => {
          const newSet = new Set(state.visibleTags);
          if (newSet.has(tag)) {
            newSet.delete(tag);
          } else {
            newSet.add(tag);
          }
          return { visibleTags: newSet };
        }),

      resetFilters: () =>
        set({
          visibleGeometryTypes: new Set(['Point', 'LineString', 'Polygon']),
          visibleTags: new Set(),
        }),

      startWalk: () => set({ isWalking: true, walkPoints: [] }),

      addWalkPoint: (pt) =>
        set((state) => {
          const last = state.walkPoints[state.walkPoints.length - 1];
          // Only record a point once you've moved ~2m, to avoid a dense trickle
          // of near-identical GPS points (and the rendering cost that brings).
          if (last && Math.abs(last[0] - pt[0]) < 2e-5 && Math.abs(last[1] - pt[1]) < 2e-5) {
            return state;
          }
          return { walkPoints: [...state.walkPoints, pt] };
        }),

      clearWalk: () => set({ isWalking: false, walkPoints: [] }),

      setLocated: (hasLocated) => set({ hasLocated }),

      setPendingMeasure: (pendingMeasure) => set({ pendingMeasure }),

      setCaptureOpen: (captureOpen) => set({ captureOpen }),
    }),
    {
      name: 'landmark-map-store',
      version: 1,
      // v1 makes satellite the default basemap; flip stores saved before that
      // (which persisted the old 'osm' default) over to satellite once.
      migrate: (persisted, version) => {
        const state = persisted as {
          center: [number, number];
          zoom: number;
          basemap: BasemapType;
          hasLocated: boolean;
        };
        if (version < 1) {
          return { ...state, basemap: 'satellite' as BasemapType };
        }
        return state;
      },
      partialize: (state) => ({
        center: state.center,
        zoom: state.zoom,
        basemap: state.basemap,
        hasLocated: state.hasLocated,
      }),
    }
  )
);
