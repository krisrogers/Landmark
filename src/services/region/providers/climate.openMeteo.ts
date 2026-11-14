/**
 * Climate normal from Open-Meteo's historical archive (keyless, CORS-friendly).
 * A single year is misleading — a drought or wet year skews the "annual"
 * figure badly — so we average a multi-year window into the figures that
 * matter for plant selection. Worldwide default.
 */
import type { ClimateContext, ContextProvider, LatLng } from '../types';

const DAY = 24 * 60 * 60 * 1000;
/** Years to average for the climate normal (smooths drought/wet cycles). */
const WINDOW_YEARS = 10;

export const openMeteoClimate: ContextProvider<ClimateContext> = {
  // Versioned key: bumping it invalidates single-year caches from the old impl.
  key: 'climate.open-meteo.v2',
  ttlMs: 30 * DAY,

  async fetch(at: LatLng, signal?: AbortSignal): Promise<ClimateContext | null> {
    // Full calendar years only — the archive lags "today" by a few days.
    const endYear = new Date().getUTCFullYear() - 1;
    const startYear = endYear - (WINDOW_YEARS - 1);
    const url =
      `https://archive-api.open-meteo.com/v1/archive?latitude=${at.lat.toFixed(5)}` +
      `&longitude=${at.lng.toFixed(5)}&start_date=${startYear}-01-01&end_date=${endYear}-12-31` +
      `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`;

    try {
      const res = await fetch(url, { signal });
      if (!res.ok) return null;
      const data = (await res.json()) as {
        daily?: {
          time?: string[];
          temperature_2m_max?: (number | null)[];
          temperature_2m_min?: (number | null)[];
          precipitation_sum?: (number | null)[];
        };
      };
      const d = data.daily;
      if (!d?.time?.length || !d.temperature_2m_max || !d.temperature_2m_min) return null;

      let totalRain = 0;
      let rainDays = 0; // days with a precip reading (to derive years covered)
      let tMaxExtreme = -Infinity;
      let tMinExtreme = Infinity;
      let totalFrostDays = 0;
      // Per-(year,month) mean daily max, to average the warmest month over years.
      const monthSum = new Array(12).fill(0);
      const monthCount = new Array(12).fill(0);

      for (let i = 0; i < d.time.length; i++) {
        const tmax = d.temperature_2m_max[i];
        const tmin = d.temperature_2m_min[i];
        const precip = d.precipitation_sum?.[i];
        if (typeof precip === 'number') {
          totalRain += precip;
          rainDays += 1;
        }
        if (typeof tmax === 'number') {
          if (tmax > tMaxExtreme) tMaxExtreme = tmax;
          const month = Number(d.time[i].slice(5, 7)) - 1;
          if (month >= 0 && month < 12) {
            monthSum[month] += tmax;
            monthCount[month] += 1;
          }
        }
        if (typeof tmin === 'number') {
          if (tmin < tMinExtreme) tMinExtreme = tmin;
          if (tmin <= 0) totalFrostDays += 1;
        }
      }

      if (tMaxExtreme === -Infinity || tMinExtreme === Infinity || rainDays === 0) return null;

      // Derive years from actual coverage so partial data doesn't skew the mean.
      const yearsCovered = Math.max(rainDays / 365.25, 0.5);

      let warmestMonthMeanMaxC = -Infinity;
      for (let m = 0; m < 12; m++) {
        if (monthCount[m] > 0) {
          warmestMonthMeanMaxC = Math.max(warmestMonthMeanMaxC, monthSum[m] / monthCount[m]);
        }
      }

      return {
        annualRainfallMm: Math.round(totalRain / yearsCovered),
        tMaxExtremeC: Math.round(tMaxExtreme * 10) / 10,
        tMinExtremeC: Math.round(tMinExtreme * 10) / 10,
        frostDays: Math.round(totalFrostDays / yearsCovered),
        warmestMonthMeanMaxC: Math.round(warmestMonthMeanMaxC * 10) / 10,
        startYear,
        endYear,
      };
    } catch {
      return null;
    }
  },
};
