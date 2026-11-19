/**
 * Pure terrain math — derive slope, aspect and landform from a 3×3 grid of
 * elevations sampled around a point. No I/O, no dependencies: unit-tested.
 *
 * Grid is row-major, **north row first**:
 *   0:NW 1:N 2:NE
 *   3:W  4:C 5:E
 *   6:SW 7:S 8:SE
 */
import type { Compass, Landform } from './types';

export interface TerrainResult {
  slopeDeg: number;
  /** Degrees from north (0..360) the slope faces downhill, or null if ~flat. */
  aspectDeg: number | null;
  aspect: Compass | null;
  landform: Landform;
}

/** Below this slope the aspect is meaningless, so we report flat. */
const FLAT_SLOPE_DEG = 0.75;
/** Elevation offset (m) of the centre vs. its neighbours that marks a ridge/gully. */
const TPI_THRESHOLD_M = 1.5;
/** Above this slope a non-ridge/gully cell is "mid-slope" rather than "flat". */
const MIDSLOPE_MIN_DEG = 3;

const COMPASS_8: Compass[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

/** Map a bearing in degrees (0 = N, clockwise) to an 8-wind compass point. */
export function degToCompass8(deg: number): Compass {
  const normalized = ((deg % 360) + 360) % 360;
  const index = Math.round(normalized / 45) % 8;
  return COMPASS_8[index];
}

/**
 * Horn's method for slope/aspect over a 3×3 grid, plus a topographic-position
 * index (TPI) for landform. `cellMetersX`/`cellMetersY` are the ground spacing
 * between adjacent grid columns/rows in metres.
 */
export function computeTerrain(
  z: number[],
  cellMetersX: number,
  cellMetersY: number
): TerrainResult {
  if (z.length !== 9) {
    throw new Error(`computeTerrain expects 9 elevations, got ${z.length}`);
  }

  // East-positive and north-positive gradients (rise over run, m/m).
  const dzdx = (z[2] + 2 * z[5] + z[8] - (z[0] + 2 * z[3] + z[6])) / (8 * cellMetersX);
  const dzdy = (z[0] + 2 * z[1] + z[2] - (z[6] + 2 * z[7] + z[8])) / (8 * cellMetersY);

  const slopeRad = Math.atan(Math.hypot(dzdx, dzdy));
  const slopeDeg = (slopeRad * 180) / Math.PI;

  let aspectDeg: number | null = null;
  let aspect: Compass | null = null;
  if (slopeDeg >= FLAT_SLOPE_DEG) {
    // Downhill direction as an (east, north) vector is the negative gradient.
    // Compass bearing: 0 = N, increasing clockwise → atan2(east, north).
    const bearing = (Math.atan2(-dzdx, -dzdy) * 180) / Math.PI;
    aspectDeg = ((bearing % 360) + 360) % 360;
    aspect = degToCompass8(aspectDeg);
  }

  // TPI: centre minus mean of the 8 neighbours. Positive = sticks up (ridge).
  const neighbours = [z[0], z[1], z[2], z[3], z[5], z[6], z[7], z[8]];
  const neighbourMean = neighbours.reduce((a, b) => a + b, 0) / neighbours.length;
  const tpi = z[4] - neighbourMean;

  let landform: Landform;
  if (tpi > TPI_THRESHOLD_M) {
    landform = 'ridge/upper-slope';
  } else if (tpi < -TPI_THRESHOLD_M) {
    landform = 'gully/valley';
  } else if (slopeDeg < MIDSLOPE_MIN_DEG) {
    landform = 'flat/plain';
  } else {
    landform = 'mid-slope';
  }

  return { slopeDeg, aspectDeg, aspect, landform };
}

/**
 * Build a 3×3 grid of lat/lng offsets around a centre, spaced `spacingM` metres
 * apart on the ground. Returns points in the same row-major, north-first order
 * `computeTerrain` expects, plus the cell spacing to pass through.
 */
export function gridAround(
  lat: number,
  lng: number,
  spacingM: number
): { points: { lat: number; lng: number }[]; cellMetersX: number; cellMetersY: number } {
  const metersPerDegLat = 111_320;
  const metersPerDegLng = 111_320 * Math.cos((lat * Math.PI) / 180);
  const dLat = spacingM / metersPerDegLat;
  const dLng = spacingM / metersPerDegLng;

  // Rows north→south (+dLat is north), columns west→east.
  const rows = [1, 0, -1]; // north, centre, south
  const cols = [-1, 0, 1]; // west, centre, east
  const points: { lat: number; lng: number }[] = [];
  for (const r of rows) {
    for (const c of cols) {
      points.push({ lat: lat + r * dLat, lng: lng + c * dLng });
    }
  }
  return { points, cellMetersX: spacingM, cellMetersY: spacingM };
}
