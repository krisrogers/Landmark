/**
 * Tiny localStorage cache for provider results, keyed by provider + rounded
 * coordinates. Lets context be fetched once on signal and reused in the field
 * (offline). Every access is guarded — storage can be unavailable or full.
 */
const STORE_PREFIX = 'landmark-region-cache:';

interface Entry<T> {
  t: number;
  v: T;
}

function keyFor(providerKey: string, lat: number, lng: number): string {
  // ~100 m rounding — fine for terrain/climate/soil at property scale.
  return `${STORE_PREFIX}${providerKey}:${lat.toFixed(3)}:${lng.toFixed(3)}`;
}

export function getCached<T>(
  providerKey: string,
  lat: number,
  lng: number,
  ttlMs: number
): T | null {
  try {
    const raw = localStorage.getItem(keyFor(providerKey, lat, lng));
    if (!raw) return null;
    const entry = JSON.parse(raw) as Entry<T>;
    if (Date.now() - entry.t > ttlMs) return null;
    return entry.v;
  } catch {
    return null;
  }
}

export function setCached<T>(
  providerKey: string,
  lat: number,
  lng: number,
  value: T
): void {
  try {
    const entry: Entry<T> = { t: Date.now(), v: value };
    localStorage.setItem(keyFor(providerKey, lat, lng), JSON.stringify(entry));
  } catch {
    /* storage unavailable or full — caching is best-effort */
  }
}
