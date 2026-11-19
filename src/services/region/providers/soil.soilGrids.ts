/**
 * Topsoil pH and texture from ISRIC SoilGrids (free, global, 250 m). The REST
 * endpoint may be CORS-restricted in some browsers, so this provider fails
 * softly (returns null) and the brief flags soil as unknown — the advisor is
 * told so and won't invent it. A higher-res CSIRO grid can override for `AU`.
 */
import type { ContextProvider, LatLng, SoilContext, SoilTexture } from '../types';

const DAY = 24 * 60 * 60 * 1000;

/** Simplified USDA texture class from sand/silt/clay percentages. */
export function classifyTexture(sand: number, silt: number, clay: number): SoilTexture {
  if (clay >= 40) return 'clay';
  if (clay >= 27) return 'clay loam';
  if (sand >= 85) return 'sand';
  if (sand >= 70) return 'loamy sand';
  if (silt >= 50 && clay < 12) return 'silt loam';
  if (sand >= 43 && clay < 20) return 'sandy loam';
  return 'loam';
}

interface SoilGridsLayer {
  name?: string;
  depths?: { values?: { mean?: number | null } }[];
}

export const soilGridsSoil: ContextProvider<SoilContext> = {
  key: 'soil.soilgrids',
  ttlMs: 180 * DAY, // soil is effectively static

  async fetch(at: LatLng, signal?: AbortSignal): Promise<SoilContext | null> {
    const url =
      `https://rest.isric.org/soilgrids/v2.0/properties/query?lon=${at.lng.toFixed(5)}` +
      `&lat=${at.lat.toFixed(5)}&property=phh2o&property=sand&property=silt&property=clay` +
      `&depth=0-5cm&value=mean`;

    try {
      const res = await fetch(url, { signal });
      if (!res.ok) return null;
      const data = (await res.json()) as { properties?: { layers?: SoilGridsLayer[] } };
      const layers = data.properties?.layers;
      if (!layers) return null;

      const meanOf = (name: string): number | undefined => {
        const layer = layers.find((l) => l.name === name);
        const mean = layer?.depths?.[0]?.values?.mean;
        return typeof mean === 'number' ? mean : undefined;
      };

      // SoilGrids units: phh2o is pH×10; sand/silt/clay are g/kg.
      const phRaw = meanOf('phh2o');
      const sandRaw = meanOf('sand');
      const siltRaw = meanOf('silt');
      const clayRaw = meanOf('clay');

      const ph = phRaw !== undefined ? Math.round((phRaw / 10) * 10) / 10 : undefined;
      const sandPct = sandRaw !== undefined ? Math.round(sandRaw / 10) : undefined;
      const siltPct = siltRaw !== undefined ? Math.round(siltRaw / 10) : undefined;
      const clayPct = clayRaw !== undefined ? Math.round(clayRaw / 10) : undefined;

      const texture: SoilTexture =
        sandPct !== undefined && siltPct !== undefined && clayPct !== undefined
          ? classifyTexture(sandPct, siltPct, clayPct)
          : 'unknown';

      if (ph === undefined && texture === 'unknown') return null;
      return { ph, sandPct, siltPct, clayPct, texture };
    } catch {
      return null;
    }
  },
};
