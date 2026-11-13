/**
 * Elevation / slope / aspect / landform from Open-Meteo's elevation API
 * (keyless, CORS-friendly). We sample a 3×3 grid around the point in one
 * request and derive terrain on-device. Works worldwide, so it's the default
 * for both `global` and `AU` until a higher-res AU DEM override is added.
 */
import type { ContextProvider, ElevationContext, LatLng } from '../types';
import { gridAround, computeTerrain } from '../terrain';

const SPACING_M = 60; // grid cell spacing — large enough to read real landform
const DAY = 24 * 60 * 60 * 1000;

export const openMeteoElevation: ContextProvider<ElevationContext> = {
  key: 'elevation.open-meteo',
  ttlMs: 180 * DAY, // terrain is effectively static

  async fetch(at: LatLng, signal?: AbortSignal): Promise<ElevationContext | null> {
    const { points, cellMetersX, cellMetersY } = gridAround(at.lat, at.lng, SPACING_M);
    const lats = points.map((p) => p.lat.toFixed(6)).join(',');
    const lngs = points.map((p) => p.lng.toFixed(6)).join(',');
    const url = `https://api.open-meteo.com/v1/elevation?latitude=${lats}&longitude=${lngs}`;

    try {
      const res = await fetch(url, { signal });
      if (!res.ok) return null;
      const data = (await res.json()) as { elevation?: number[] };
      const z = data.elevation;
      if (!Array.isArray(z) || z.length !== 9 || z.some((v) => typeof v !== 'number')) {
        return null;
      }
      const terrain = computeTerrain(z, cellMetersX, cellMetersY);
      return {
        elevationM: Math.round(z[4]),
        slopeDeg: Math.round(terrain.slopeDeg * 10) / 10,
        aspect: terrain.aspect,
        aspectDeg: terrain.aspectDeg === null ? null : Math.round(terrain.aspectDeg),
        landform: terrain.landform,
      };
    } catch {
      return null;
    }
  },
};
