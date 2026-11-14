export interface ApproxLocation {
  lat: number;
  lng: number;
  source: 'ip';
}

/**
 * A free, no-key IP geolocation providers tried in order. Each returns an
 * approximate [lat, lng] for the caller's network — enough to pick a sensible
 * initial map centre without a GPS permission prompt. Best-effort only: this is
 * the single network dependency in an otherwise offline-first app, so every
 * failure path returns null and the caller falls back to a world view.
 */
const PROVIDERS: { url: string; pick: (data: Record<string, unknown>) => [unknown, unknown] | null }[] = [
  { url: 'https://ipapi.co/json/', pick: (d) => [d.latitude, d.longitude] },
  {
    url: 'https://ipwho.is/',
    pick: (d) => (d.success === false ? null : [d.latitude, d.longitude]),
  },
];

export async function getApproxLocation(timeoutMs = 4000): Promise<ApproxLocation | null> {
  // Don't even try when the browser knows it is offline.
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return null;
  if (typeof fetch !== 'function') return null;

  for (const provider of PROVIDERS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(provider.url, { signal: controller.signal });
      if (!res.ok) continue;
      const data = (await res.json()) as Record<string, unknown>;
      const picked = provider.pick(data);
      if (!picked) continue;
      const lat = Number(picked[0]);
      const lng = Number(picked[1]);
      // Reject non-numbers and the 0,0 "null island" that signals a failed lookup.
      if (Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0)) {
        return { lat, lng, source: 'ip' };
      }
    } catch {
      // network error / abort / bad JSON — try the next provider
    } finally {
      clearTimeout(timer);
    }
  }
  return null;
}
