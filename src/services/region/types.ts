/**
 * Regional context pipeline — types.
 *
 * The advisor's "site brief" is assembled by a set of pluggable **context
 * providers**, chosen per **region**. Regionality is a seam from the start:
 * adding a region means implementing + registering providers, with no changes
 * to existing code. Only `AU` and a worldwide `global` fallback exist now.
 *
 * Division of labour: providers fetch/derive raw facts; the assembler turns
 * them into plain-language, hemisphere-aware conditions for the model. The app
 * interprets the terrain; the AI does the horticulture.
 */

export type RegionKey = 'AU' | 'global';

export interface LatLng {
  lat: number;
  lng: number;
}

/** 8-wind compass direction. */
export type Compass = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';

export type Landform =
  | 'ridge/upper-slope'
  | 'mid-slope'
  | 'gully/valley'
  | 'flat/plain';

export interface ElevationContext {
  elevationM: number;
  /** Slope steepness in degrees (0 = flat). */
  slopeDeg: number;
  /** Compass direction the slope faces (downhill), or null if ~flat. */
  aspect: Compass | null;
  /** Aspect in degrees from north (0..360), or null if ~flat. */
  aspectDeg: number | null;
  landform: Landform;
}

export interface ClimateContext {
  /** Mean annual precipitation averaged over the sampled years (mm/yr). */
  annualRainfallMm: number;
  /** Hottest daily max observed across the window (°C). */
  tMaxExtremeC: number;
  /** Coldest daily min observed across the window (°C). */
  tMinExtremeC: number;
  /** Mean number of frost days (min ≤ 0°C) per year. */
  frostDays: number;
  /** Mean daily max of the warmest month, averaged over the window (°C). */
  warmestMonthMeanMaxC: number;
  /** First and last calendar year in the (temperature) averaging window. */
  startYear: number;
  endYear: number;
  /** Where the rainfall figure came from, when better than the default model. */
  rainfallSource?: string;
  /** Averaging window for the rainfall figure, if different from the temps. */
  rainfallStartYear?: number;
  rainfallEndYear?: number;
}

export type SoilTexture =
  | 'sand'
  | 'loamy sand'
  | 'sandy loam'
  | 'loam'
  | 'silt loam'
  | 'clay loam'
  | 'clay'
  | 'unknown';

export interface SoilContext {
  /** Topsoil pH (water). */
  ph?: number;
  sandPct?: number;
  siltPct?: number;
  clayPct?: number;
  texture: SoilTexture;
}

/** A provider returns its slice of context, or null when it can't (offline, not covered). */
export interface ContextProvider<T> {
  readonly key: string;
  /** Long cache TTL in ms (static data like terrain) or shorter (climate). */
  readonly ttlMs: number;
  fetch(at: LatLng, signal?: AbortSignal): Promise<T | null>;
}

/** A region's set of providers. Any may be omitted (falls back to global). */
export interface RegionPack {
  readonly region: RegionKey;
  readonly label: string;
  elevation: ContextProvider<ElevationContext>;
  climate: ContextProvider<ClimateContext>;
  soil: ContextProvider<SoilContext>;
}

/**
 * The assembled site brief handed to the advisor. Any field may be null when a
 * provider failed — the prompt renderer flags those as explicitly unknown so
 * the model never invents conditions it wasn't given.
 */
export interface SiteBrief {
  at: LatLng;
  region: RegionKey;
  regionLabel: string;
  hemisphere: 'northern' | 'southern';
  /** Rough place/area description from the feature (name, geometry, size). */
  place: {
    name: string;
    geometryType: 'Point' | 'LineString' | 'Polygon';
    areaHa?: number;
    lengthM?: number;
    /** Best-fit rectangle for a polygon: long side, short side (metres). */
    approxLengthM?: number;
    approxWidthM?: number;
    /** Compass axis the long side runs along, e.g. "NE–SW". */
    orientation?: string;
  };
  elevation: ElevationContext | null;
  climate: ClimateContext | null;
  soil: SoilContext | null;
  /** Human-readable notes about what could NOT be determined. */
  unavailable: string[];
}
