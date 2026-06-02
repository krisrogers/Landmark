/**
 * Geometry types and pure geo math.
 *
 * Geometries are stored as GeoJSON-style objects ([longitude, latitude] order)
 * so they stay compatible with any future export/sync target.
 * react-native-maps uses { latitude, longitude } objects, so conversion
 * helpers live here too.
 */

export type GeometryType = 'Point' | 'LineString' | 'Polygon';

export interface PointGeometry {
  type: 'Point';
  coordinates: [number, number]; // [lng, lat]
}

export interface LineStringGeometry {
  type: 'LineString';
  coordinates: [number, number][];
}

export interface PolygonGeometry {
  type: 'Polygon';
  /** Single outer ring, closed (first point === last point). */
  coordinates: [number, number][][];
}

export type FeatureGeometry = PointGeometry | LineStringGeometry | PolygonGeometry;

/** react-native-maps coordinate. */
export interface LatLng {
  latitude: number;
  longitude: number;
}

const EARTH_RADIUS_M = 6371008.8;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

// ---------------------------------------------------------------------------
// Construction
// ---------------------------------------------------------------------------

export function createPointGeometry(coord: LatLng): PointGeometry {
  return { type: 'Point', coordinates: [coord.longitude, coord.latitude] };
}

export function createLineGeometry(coords: LatLng[]): LineStringGeometry {
  return {
    type: 'LineString',
    coordinates: coords.map((c) => [c.longitude, c.latitude] as [number, number]),
  };
}

/** Creates a polygon from a walked path, closing the ring if necessary. */
export function createPolygonGeometry(coords: LatLng[]): PolygonGeometry {
  const ring = coords.map((c) => [c.longitude, c.latitude] as [number, number]);
  if (ring.length > 0) {
    const [first, last] = [ring[0], ring[ring.length - 1]];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      ring.push([first[0], first[1]]);
    }
  }
  return { type: 'Polygon', coordinates: [ring] };
}

// ---------------------------------------------------------------------------
// Conversion (GeoJSON <-> react-native-maps)
// ---------------------------------------------------------------------------

export function toLatLng(position: [number, number]): LatLng {
  return { latitude: position[1], longitude: position[0] };
}

/** Returns the coordinates of a geometry as react-native-maps LatLng objects. */
export function geometryToLatLngs(geometry: FeatureGeometry): LatLng[] {
  switch (geometry.type) {
    case 'Point':
      return [toLatLng(geometry.coordinates)];
    case 'LineString':
      return geometry.coordinates.map(toLatLng);
    case 'Polygon':
      return geometry.coordinates[0].map(toLatLng);
  }
}

// ---------------------------------------------------------------------------
// Measurement
// ---------------------------------------------------------------------------

/** Great-circle distance between two coordinates, in meters. */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/** Total length of a path, in meters. */
export function pathLengthMeters(coords: LatLng[]): number {
  let total = 0;
  for (let i = 1; i < coords.length; i++) {
    total += distanceMeters(coords[i - 1], coords[i]);
  }
  return total;
}

/**
 * Area of a polygon ring in square meters, using the spherical excess
 * formula (Chamberlain & Duquette). Accurate for the parcel-sized areas
 * this app deals with.
 */
export function polygonAreaSqMeters(ring: LatLng[]): number {
  if (ring.length < 3) return 0;

  // Drop a duplicated closing point so indices wrap cleanly.
  const pts =
    ring.length > 1 &&
    ring[0].latitude === ring[ring.length - 1].latitude &&
    ring[0].longitude === ring[ring.length - 1].longitude
      ? ring.slice(0, -1)
      : ring;

  if (pts.length < 3) return 0;

  let total = 0;
  for (let i = 0; i < pts.length; i++) {
    const lower = pts[i];
    const middle = pts[(i + 1) % pts.length];
    const upper = pts[(i + 2) % pts.length];
    total += (toRad(upper.longitude) - toRad(lower.longitude)) * Math.sin(toRad(middle.latitude));
  }

  return Math.abs((total * EARTH_RADIUS_M * EARTH_RADIUS_M) / 2);
}

/** Area of a polygon geometry in square meters. */
export function geometryAreaSqMeters(geometry: PolygonGeometry): number {
  return polygonAreaSqMeters(geometry.coordinates[0].map(toLatLng));
}

/** Length of a line geometry in meters. */
export function geometryLengthMeters(geometry: LineStringGeometry): number {
  return pathLengthMeters(geometry.coordinates.map(toLatLng));
}

// ---------------------------------------------------------------------------
// Centers and bounds
// ---------------------------------------------------------------------------

/** Center of a geometry (simple vertex average – fine for parcel-sized shapes). */
export function geometryCenter(geometry: FeatureGeometry): LatLng {
  const coords = geometryToLatLngs(geometry);
  // For polygons skip the duplicated closing point.
  const pts =
    geometry.type === 'Polygon' && coords.length > 1 ? coords.slice(0, -1) : coords;

  const sum = pts.reduce(
    (acc, c) => ({ latitude: acc.latitude + c.latitude, longitude: acc.longitude + c.longitude }),
    { latitude: 0, longitude: 0 }
  );
  return { latitude: sum.latitude / pts.length, longitude: sum.longitude / pts.length };
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

export function formatArea(squareMeters: number): string {
  if (squareMeters >= 10000) {
    return `${(squareMeters / 10000).toFixed(2)} ha`;
  }
  return `${Math.round(squareMeters)} m²`;
}

export function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(2)} km`;
  }
  return `${Math.round(meters)} m`;
}

/** Human-readable one-line summary of a geometry. */
export function describeGeometry(geometry: FeatureGeometry): string {
  switch (geometry.type) {
    case 'Point': {
      const [lng, lat] = geometry.coordinates;
      return `Pin at ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    }
    case 'LineString':
      return `Path · ${formatDistance(geometryLengthMeters(geometry))}`;
    case 'Polygon':
      return `Area · ${formatArea(geometryAreaSqMeters(geometry))}`;
  }
}
