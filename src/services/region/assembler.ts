/**
 * Context assembler — resolves the region for a Place, runs that region's
 * providers (cached, in parallel), and produces a SiteBrief. Any provider may
 * fail, be offline, or not cover the spot; the brief degrades gracefully and
 * records what was unavailable so the advisor is told what it does NOT know.
 */
import type { Feature, PolygonGeometry, LineStringGeometry } from '@/types';
import { getGeometryCenter, calculatePolygonArea, calculateLineLength } from '@/services/geo';
import type { ContextProvider, LatLng, SiteBrief } from './types';
import { resolveRegion } from './resolver';
import { packForRegion } from './packs';
import { hemisphereOf } from './interpret';
import { getCached, setCached } from './cache';

/** Per-provider network timeout — a stalled request must not hang the brief. */
const PROVIDER_TIMEOUT_MS = 9000;

export type BriefStep = 'Terrain' | 'Climate' | 'Soil';
export type BriefStepStatus = 'loading' | 'ok' | 'unavailable';
export interface AssembleOptions {
  signal?: AbortSignal;
  onProgress?: (step: BriefStep, status: BriefStepStatus) => void;
}

/**
 * Run one provider through the cache, with a hard timeout so a hanging fetch
 * resolves to null (and the brief degrades) instead of spinning forever.
 */
async function runProvider<T>(
  provider: ContextProvider<T>,
  at: LatLng,
  step: BriefStep,
  opts: AssembleOptions
): Promise<T | null> {
  opts.onProgress?.(step, 'loading');

  const cached = getCached<T>(provider.key, at.lat, at.lng, provider.ttlMs);
  if (cached !== null) {
    opts.onProgress?.(step, 'ok');
    return cached;
  }

  const ctrl = new AbortController();
  const onAbort = () => ctrl.abort();
  if (opts.signal) {
    if (opts.signal.aborted) ctrl.abort();
    else opts.signal.addEventListener('abort', onAbort);
  }
  const timer = setTimeout(() => ctrl.abort(), PROVIDER_TIMEOUT_MS);

  try {
    const fresh = await provider.fetch(at, ctrl.signal);
    if (fresh !== null) setCached(provider.key, at.lat, at.lng, fresh);
    opts.onProgress?.(step, fresh !== null ? 'ok' : 'unavailable');
    return fresh;
  } catch {
    opts.onProgress?.(step, 'unavailable');
    return null;
  } finally {
    clearTimeout(timer);
    opts.signal?.removeEventListener('abort', onAbort);
  }
}

export async function assembleSiteBrief(
  feature: Feature,
  opts: AssembleOptions = {}
): Promise<SiteBrief> {
  const [lat, lng] = getGeometryCenter(feature.geometry);
  const at: LatLng = { lat, lng };
  const region = resolveRegion(at);
  const pack = packForRegion(region);

  const [elevation, climate, soil] = await Promise.all([
    runProvider(pack.elevation, at, 'Terrain', opts),
    runProvider(pack.climate, at, 'Climate', opts),
    runProvider(pack.soil, at, 'Soil', opts),
  ]);

  const place: SiteBrief['place'] = {
    name: feature.name,
    geometryType: feature.geometryType,
  };
  if (feature.geometryType === 'Polygon') {
    place.areaHa =
      Math.round((calculatePolygonArea(feature.geometry as PolygonGeometry) / 10_000) * 100) / 100;
  } else if (feature.geometryType === 'LineString') {
    place.lengthM = Math.round(calculateLineLength(feature.geometry as LineStringGeometry));
  }

  const unavailable: string[] = [];
  if (!elevation) unavailable.push('terrain (elevation/slope/aspect)');
  if (!climate) unavailable.push('climate (rainfall/temperature/frost)');
  if (!soil) unavailable.push('soil (pH/texture)');

  return {
    at,
    region,
    regionLabel: pack.label,
    hemisphere: hemisphereOf(lat),
    place,
    elevation,
    climate,
    soil,
    unavailable,
  };
}
