import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type BasemapType = 'osm' | 'satellite';
export type DrawingMode = 'none' | 'point' | 'line' | 'polygon';
export type GpsStatus = 'idle' | 'locating' | 'locked' | 'error';

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
  visibleGeometryTypes: Set<string>;
  visibleTags: Set<string>;

  // Walk-to-trace recording ([lat, lng] points)
  isWalking: boolean;
  walkPoints: [number, number][];

  // Whether an initial map location has been established (GPS/IP/manual move).
  hasLocated: boolean;

  // Actions
  setCenter: (center: [number, number]) => void;
  setZoom: (zoom: number) => void;
  setView: (center: [number, number], zoom: number) => void;
  setBasemap: (basemap: BasemapType) => void;
  setDrawingMode: (mode: DrawingMode) => void;
  setGpsPosition: (position: GeolocationPosition | null) => void;
  setGpsError: (error: string | null) => void;
  beginGpsRequest: () => void;
  toggleGpsLocation: () => void;
  toggleGeometryType: (type: string) => void;
  toggleTag: (tag: string) => void;
  resetFilters: () => void;
  startWalk: () => void;
  addWalkPoint: (pt: [number, number]) => void;
  clearWalk: () => void;
  setLocated: (located: boolean) => void;
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
      visibleGeometryTypes: new Set(['Point', 'LineString', 'Polygon']),
      visibleTags: new Set(),
      isWalking: false,
      walkPoints: [],
      hasLocated: false,

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
      setGpsError: (gpsError) => set({ gpsError, gpsStatus: gpsError ? 'error' : 'idle' }),
      beginGpsRequest: () => set({ gpsStatus: 'locating', gpsError: null }),
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
          // Skip near-duplicate points (< ~1e-6 deg) to avoid GPS jitter buildup.
          if (last && Math.abs(last[0] - pt[0]) < 1e-6 && Math.abs(last[1] - pt[1]) < 1e-6) {
            return state;
          }
          return { walkPoints: [...state.walkPoints, pt] };
        }),

      clearWalk: () => set({ isWalking: false, walkPoints: [] }),

      setLocated: (hasLocated) => set({ hasLocated }),
    }),
    {
      name: 'landmark-map-store',
      partialize: (state) => ({
        center: state.center,
        zoom: state.zoom,
        basemap: state.basemap,
        hasLocated: state.hasLocated,
      }),
    }
  )
);
