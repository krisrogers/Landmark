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

/** Run one provider through the cache. Network failures resolve to null. */
async function runProvider<T>(
  provider: ContextProvider<T>,
  at: LatLng,
  signal?: AbortSignal
): Promise<T | null> {
  const cached = getCached<T>(provider.key, at.lat, at.lng, provider.ttlMs);
  if (cached !== null) return cached;
  const fresh = await provider.fetch(at, signal);
  if (fresh !== null) setCached(provider.key, at.lat, at.lng, fresh);
  return fresh;
}

export async function assembleSiteBrief(
  feature: Feature,
  signal?: AbortSignal
): Promise<SiteBrief> {
  const [lat, lng] = getGeometryCenter(feature.geometry);
  const at: LatLng = { lat, lng };
  const region = resolveRegion(at);
  const pack = packForRegion(region);

  const [elevation, climate, soil] = await Promise.all([
    runProvider(pack.elevation, at, signal),
    runProvider(pack.climate, at, signal),
    runProvider(pack.soil, at, signal),
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
