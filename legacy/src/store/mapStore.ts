import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type BasemapType = 'osm' | 'satellite' | 'none';
export type DrawingMode = 'none' | 'point' | 'line' | 'polygon';

interface MapState {
  center: [number, number]; // [lat, lng]
  zoom: number;
  basemap: BasemapType;
  drawingMode: DrawingMode;
  showGpsLocation: boolean;
  gpsPosition: GeolocationPosition | null;
  gpsError: string | null;
  visibleGeometryTypes: Set<string>;
  visibleTags: Set<string>;

  // Actions
  setCenter: (center: [number, number]) => void;
  setZoom: (zoom: number) => void;
  setView: (center: [number, number], zoom: number) => void;
  setBasemap: (basemap: BasemapType) => void;
  setDrawingMode: (mode: DrawingMode) => void;
  setGpsPosition: (position: GeolocationPosition | null) => void;
  setGpsError: (error: string | null) => void;
  toggleGpsLocation: () => void;
  toggleGeometryType: (type: string) => void;
  toggleTag: (tag: string) => void;
  resetFilters: () => void;
}

export const useMapStore = create<MapState>()(
  persist(
    (set) => ({
      center: [0, 0],
      zoom: 13,
      basemap: 'osm',
      drawingMode: 'none',
      showGpsLocation: true,
      gpsPosition: null,
      gpsError: null,
      visibleGeometryTypes: new Set(['Point', 'LineString', 'Polygon']),
      visibleTags: new Set(),

      setCenter: (center) => set({ center }),
      setZoom: (zoom) => set({ zoom }),
      setView: (center, zoom) => set({ center, zoom }),
      setBasemap: (basemap) => set({ basemap }),
      setDrawingMode: (drawingMode) => set({ drawingMode }),
      setGpsPosition: (gpsPosition) => set({ gpsPosition, gpsError: null }),
      setGpsError: (gpsError) => set({ gpsError }),
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
    }),
    {
      name: 'landmark-map-store',
      partialize: (state) => ({
        center: state.center,
        zoom: state.zoom,
        basemap: state.basemap,
      }),
    }
  )
);
