import { describe, expect, it } from '@jest/globals';

import {
  createLineGeometry,
  createPointGeometry,
  createPolygonGeometry,
  describeGeometry,
  distanceMeters,
  formatArea,
  formatDistance,
  geometryAreaSqMeters,
  geometryCenter,
  geometryLengthMeters,
  geometryToLatLngs,
  pathLengthMeters,
  polygonAreaSqMeters,
  type LatLng,
} from '../geo';

// A ~100m x ~100m square near Brisbane (-27.5°S). 0.0009° latitude ≈ 100m.
// Longitude is scaled by 1/cos(lat) so each side is ~100m on the ground.
const LAT = -27.5;
const LAT_STEP = 0.0009;
const LNG_STEP = 0.0009 / Math.cos((LAT * Math.PI) / 180);
const SQUARE: LatLng[] = [
  { latitude: LAT, longitude: 153.0 },
  { latitude: LAT + LAT_STEP, longitude: 153.0 },
  { latitude: LAT + LAT_STEP, longitude: 153.0 + LNG_STEP },
  { latitude: LAT, longitude: 153.0 + LNG_STEP },
];
const SIDE_M = 100.07; // 0.0009° of latitude in meters

describe('distanceMeters', () => {
  it('computes the distance between two points one latitude-step apart', () => {
    const a: LatLng = { latitude: 0, longitude: 0 };
    const b: LatLng = { latitude: 0.001, longitude: 0 };
    // 0.001° of latitude ≈ 111.2m
    expect(distanceMeters(a, b)).toBeCloseTo(111.2, 0);
  });

  it('is zero for identical points', () => {
    const p: LatLng = { latitude: -27.5, longitude: 153.0 };
    expect(distanceMeters(p, p)).toBe(0);
  });
});

describe('pathLengthMeters', () => {
  it('sums segment distances', () => {
    expect(pathLengthMeters(SQUARE)).toBeCloseTo(SIDE_M * 3, -1);
  });

  it('returns 0 for fewer than 2 points', () => {
    expect(pathLengthMeters([])).toBe(0);
    expect(pathLengthMeters([SQUARE[0]])).toBe(0);
  });
});

describe('polygonAreaSqMeters', () => {
  it('computes the area of a ~100m square (~1 hectare)', () => {
    const area = polygonAreaSqMeters(SQUARE);
    expect(area).toBeGreaterThan(9500);
    expect(area).toBeLessThan(10500);
  });

  it('handles an explicitly closed ring the same as an open one', () => {
    const closed = [...SQUARE, SQUARE[0]];
    expect(polygonAreaSqMeters(closed)).toBeCloseTo(polygonAreaSqMeters(SQUARE), 5);
  });

  it('returns 0 for degenerate rings', () => {
    expect(polygonAreaSqMeters([])).toBe(0);
    expect(polygonAreaSqMeters(SQUARE.slice(0, 2))).toBe(0);
  });
});

describe('geometry constructors', () => {
  it('creates point geometry in [lng, lat] order', () => {
    const point = createPointGeometry({ latitude: -27.5, longitude: 153.0 });
    expect(point.coordinates).toEqual([153.0, -27.5]);
  });

  it('closes polygons automatically', () => {
    const polygon = createPolygonGeometry(SQUARE);
    const ring = polygon.coordinates[0];
    expect(ring).toHaveLength(SQUARE.length + 1);
    expect(ring[0]).toEqual(ring[ring.length - 1]);
  });

  it('does not double-close an already closed ring', () => {
    const polygon = createPolygonGeometry([...SQUARE, SQUARE[0]]);
    expect(polygon.coordinates[0]).toHaveLength(SQUARE.length + 1);
  });

  it('round-trips through geometryToLatLngs', () => {
    const line = createLineGeometry(SQUARE);
    expect(geometryToLatLngs(line)).toEqual(SQUARE);
  });
});

describe('geometry measurements', () => {
  it('measures polygon geometry area', () => {
    const polygon = createPolygonGeometry(SQUARE);
    expect(geometryAreaSqMeters(polygon)).toBeGreaterThan(9500);
  });

  it('measures line geometry length', () => {
    const line = createLineGeometry(SQUARE);
    expect(geometryLengthMeters(line)).toBeCloseTo(SIDE_M * 3, -1);
  });

  it('finds the center of a polygon', () => {
    const polygon = createPolygonGeometry(SQUARE);
    const center = geometryCenter(polygon);
    expect(center.latitude).toBeCloseTo(LAT + LAT_STEP / 2, 5);
    expect(center.longitude).toBeCloseTo(153.0 + LNG_STEP / 2, 5);
  });
});

describe('formatting', () => {
  it('formats areas in m² and hectares', () => {
    expect(formatArea(500)).toBe('500 m²');
    expect(formatArea(15000)).toBe('1.50 ha');
  });

  it('formats distances in m and km', () => {
    expect(formatDistance(42)).toBe('42 m');
    expect(formatDistance(1500)).toBe('1.50 km');
  });

  it('describes each geometry type', () => {
    expect(describeGeometry(createPointGeometry(SQUARE[0]))).toContain('Pin at');
    expect(describeGeometry(createLineGeometry(SQUARE))).toContain('Path');
    expect(describeGeometry(createPolygonGeometry(SQUARE))).toContain('Area');
  });
});
