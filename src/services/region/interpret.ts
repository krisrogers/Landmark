/**
 * Hemisphere-aware interpretation of raw terrain facts into plain language.
 * Pure functions — unit-tested. This is where the southern-hemisphere aspect
 * flip lives: a north-facing slope in Australia is the warm, sun-facing one.
 */
import type { Compass } from './types';

export type Hemisphere = 'northern' | 'southern';
export type Exposure = 'sun-facing' | 'shade-facing' | 'neutral';

export function hemisphereOf(lat: number): Hemisphere {
  return lat < 0 ? 'southern' : 'northern';
}

/** The compass bearing (deg from N) of the sun-facing aspect for a hemisphere. */
export function sunFacingBearing(hemisphere: Hemisphere): number {
  // Southern hemisphere: sun tracks to the north → north-facing is sun-facing.
  return hemisphere === 'southern' ? 0 : 180;
}

/** Smallest angle between two compass bearings, 0..180. */
export function angleBetween(a: number, b: number): number {
  const diff = Math.abs(((a - b) % 360) + 360) % 360;
  return diff > 180 ? 360 - diff : diff;
}

/**
 * Classify a slope aspect by sun exposure for its hemisphere. Within 67.5° of
 * the sun-facing bearing = sun-facing; within 67.5° of its opposite =
 * shade-facing; otherwise neutral (broadly east/west facing).
 */
export function exposureOf(aspectDeg: number, hemisphere: Hemisphere): Exposure {
  const sun = sunFacingBearing(hemisphere);
  const toSun = angleBetween(aspectDeg, sun);
  if (toSun <= 67.5) return 'sun-facing';
  if (toSun >= 112.5) return 'shade-facing';
  return 'neutral';
}

const COMPASS_WORDS: Record<Compass, string> = {
  N: 'north',
  NE: 'north-east',
  E: 'east',
  SE: 'south-east',
  S: 'south',
  SW: 'south-west',
  W: 'west',
  NW: 'north-west',
};

/**
 * A full sentence describing a slope's aspect and what it means for sun/
 * moisture, correct for the hemisphere.
 */
export function describeAspect(
  aspect: Compass,
  aspectDeg: number,
  hemisphere: Hemisphere
): string {
  const facing = `${COMPASS_WORDS[aspect]}-facing`;
  const exposure = exposureOf(aspectDeg, hemisphere);
  if (exposure === 'sun-facing') {
    return `${facing} (sun-facing in the ${hemisphere} hemisphere — warmer, drier, high sun exposure, more frost- and wind-exposed)`;
  }
  if (exposure === 'shade-facing') {
    return `${facing} (shade-facing in the ${hemisphere} hemisphere — cooler, moister, lower sun, more sheltered)`;
  }
  return `${facing} (receives morning or afternoon sun; moderate exposure)`;
}

/** Plain-language slope steepness. */
export function describeSlope(slopeDeg: number): string {
  if (slopeDeg < 1) return 'essentially flat';
  if (slopeDeg < 3) return `gentle (~${Math.round(slopeDeg)}°)`;
  if (slopeDeg < 10) return `moderate (~${Math.round(slopeDeg)}°)`;
  if (slopeDeg < 20) return `steep (~${Math.round(slopeDeg)}°)`;
  return `very steep (~${Math.round(slopeDeg)}°)`;
}
