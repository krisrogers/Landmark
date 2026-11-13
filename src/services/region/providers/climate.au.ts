/**
 * Australian climate provider: BoM-derived rainfall from SILO (DataDrill,
 * ~5 km grid) overriding the reanalysis figure, with temperatures/frost kept
 * from Open-Meteo. SILO allows direct browser calls (CORS), so no proxy — but
 * it needs an email identifier (from settings); without one, or if it fails,
 * this falls back to the plain Open-Meteo climate.
 */
import type { ClimateContext, ContextProvider, LatLng } from '../types';
import { openMeteoClimate } from './climate.openMeteo';
import { useAIStore } from '@/store';

const DAY = 24 * 60 * 60 * 1000;
/** Rainfall normal window (matches the temperature window). */
const RAIN_YEARS = 10;
/** SILO can return a lot of daily rows; cap its own wait below the provider budget. */
const SILO_TIMEOUT_MS = 8000;

/** Pull daily rainfall out of SILO's JSON, tolerant of its exact shape. */
function siloRainValues(json: unknown): number[] {
  const j = json as { data?: unknown[] } | unknown[];
  const days: Record<string, unknown>[] = Array.isArray(j)
    ? (j as Record<string, unknown>[])
    : Array.isArray((j as { data?: unknown[] }).data)
      ? ((j as { data: unknown[] }).data as Record<string, unknown>[])
      : [];
  const out: number[] = [];
  for (const d of days) {
    let found = false;
    for (const [k, v] of Object.entries(d)) {
      if (/rain/i.test(k) && typeof v === 'number') {
        out.push(v);
        found = true;
        break;
      }
    }
    if (found) continue;
    const vars = (d as { variables?: Record<string, unknown>[] }).variables;
    if (Array.isArray(vars)) {
      const rv = vars.find((x) =>
        /rain/i.test(
          String(x.name ?? x.variable_name ?? x.variable_code ?? x.code ?? '')
        )
      );
      if (rv && typeof rv.value === 'number') out.push(rv.value);
    }
  }
  return out;
}

async function siloAnnualRainfall(
  at: LatLng,
  email: string,
  parentSignal: AbortSignal | undefined,
  startYear: number,
  endYear: number
): Promise<number | null> {
  const ctrl = new AbortController();
  const onAbort = () => ctrl.abort();
  if (parentSignal) {
    if (parentSignal.aborted) ctrl.abort();
    else parentSignal.addEventListener('abort', onAbort);
  }
  const timer = setTimeout(() => ctrl.abort(), SILO_TIMEOUT_MS);

  const url =
    `https://www.longpaddock.qld.gov.au/cgi-bin/silo/DataDrillDataset.php?format=json` +
    `&lat=${at.lat.toFixed(4)}&lon=${at.lng.toFixed(4)}` +
    `&start=${startYear}0101&finish=${endYear}1231` +
    `&username=${encodeURIComponent(email)}&password=apirequest&comment=R`;

  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) return null;
    const vals = siloRainValues(await res.json());
    if (!vals.length) return null;
    const total = vals.reduce((a, b) => a + b, 0);
    const years = Math.max(vals.length / 365.25, 0.5);
    return Math.round(total / years);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
    parentSignal?.removeEventListener('abort', onAbort);
  }
}

export const auClimate: ContextProvider<ClimateContext> = {
  key: 'climate.au.silo+om.v1',
  ttlMs: 30 * DAY,

  async fetch(at: LatLng, signal?: AbortSignal): Promise<ClimateContext | null> {
    const email = useAIStore.getState().siloEmail.trim();
    const endYear = new Date().getUTCFullYear() - 1;
    const startYear = endYear - (RAIN_YEARS - 1);

    const [om, siloRain] = await Promise.all([
      openMeteoClimate.fetch(at, signal),
      email ? siloAnnualRainfall(at, email, signal, startYear, endYear) : Promise.resolve(null),
    ]);

    // Without the base climate we can't fill temps/frost — report unavailable.
    if (!om) return null;

    if (siloRain !== null) {
      return {
        ...om,
        annualRainfallMm: siloRain,
        rainfallSource: 'SILO (BoM, ~5 km)',
        rainfallStartYear: startYear,
        rainfallEndYear: endYear,
      };
    }
    return om;
  },
};
