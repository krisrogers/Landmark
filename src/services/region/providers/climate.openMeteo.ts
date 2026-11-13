/**
 * Climate summary from Open-Meteo's historical archive (keyless, CORS-friendly).
 * One request for the last full calendar year of daily temps + rainfall, summed
 * into the figures that matter for plant selection. Worldwide default.
 */
import type { ClimateContext, ContextProvider, LatLng } from '../types';

const DAY = 24 * 60 * 60 * 1000;

export const openMeteoClimate: ContextProvider<ClimateContext> = {
  key: 'climate.open-meteo',
  ttlMs: 30 * DAY,

  async fetch(at: LatLng, signal?: AbortSignal): Promise<ClimateContext | null> {
    // Previous full calendar year — the archive lags "today" by a few days.
    const year = new Date().getUTCFullYear() - 1;
    const start = `${year}-01-01`;
    const end = `${year}-12-31`;
    const url =
      `https://archive-api.open-meteo.com/v1/archive?latitude=${at.lat.toFixed(5)}` +
      `&longitude=${at.lng.toFixed(5)}&start_date=${start}&end_date=${end}` +
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

      let rain = 0;
      let tMaxExtreme = -Infinity;
      let tMinExtreme = Infinity;
      let frostDays = 0;
      // Accumulate daily max per month to find the warmest month's mean max.
      const monthSum = new Array(12).fill(0);
      const monthCount = new Array(12).fill(0);

      for (let i = 0; i < d.time.length; i++) {
        const tmax = d.temperature_2m_max[i];
        const tmin = d.temperature_2m_min[i];
        const precip = d.precipitation_sum?.[i] ?? 0;
        if (typeof precip === 'number') rain += precip;
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
          if (tmin <= 0) frostDays += 1;
        }
      }

      if (tMaxExtreme === -Infinity || tMinExtreme === Infinity) return null;

      let warmestMonthMeanMaxC = -Infinity;
      for (let m = 0; m < 12; m++) {
        if (monthCount[m] > 0) {
          warmestMonthMeanMaxC = Math.max(warmestMonthMeanMaxC, monthSum[m] / monthCount[m]);
        }
      }

      return {
        annualRainfallMm: Math.round(rain),
        tMaxExtremeC: Math.round(tMaxExtreme * 10) / 10,
        tMinExtremeC: Math.round(tMinExtreme * 10) / 10,
        frostDays,
        warmestMonthMeanMaxC: Math.round(warmestMonthMeanMaxC * 10) / 10,
        sampleYear: year,
      };
    } catch {
      return null;
    }
  },
};
