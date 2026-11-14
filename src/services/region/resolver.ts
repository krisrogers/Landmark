/**
 * Region resolver — maps a location to a region key. This is the regionality
 * seam: today it's a bounding box for Australia with a worldwide fallback;
 * adding a region means adding a case here and registering its pack.
 */
import type { LatLng, RegionKey } from './types';

/** Mainland Australia + Tasmania bounding box (excludes NZ, PNG). */
const AU_BOUNDS = { minLat: -44, maxLat: -10, minLng: 112, maxLng: 154 };

export function resolveRegion({ lat, lng }: LatLng): RegionKey {
  if (
    lat >= AU_BOUNDS.minLat &&
    lat <= AU_BOUNDS.maxLat &&
    lng >= AU_BOUNDS.minLng &&
    lng <= AU_BOUNDS.maxLng
  ) {
    return 'AU';
  }
  return 'global';
}
