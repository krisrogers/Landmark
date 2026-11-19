import { describe, it, expect } from 'vitest';
import { computeTerrain, degToCompass8, gridAround } from '../terrain';
import {
  hemisphereOf,
  sunFacingBearing,
  angleBetween,
  exposureOf,
  describeAspect,
} from '../interpret';
import { resolveRegion } from '../resolver';
import { classifyTexture } from '../providers/soil.soilGrids';
import { approximateRectangle, approximateShape } from '@/services/geo';
import type { PolygonGeometry } from '@/types';

describe('degToCompass8', () => {
  it('maps bearings to the nearest 8-wind point', () => {
    expect(degToCompass8(0)).toBe('N');
    expect(degToCompass8(45)).toBe('NE');
    expect(degToCompass8(90)).toBe('E');
    expect(degToCompass8(180)).toBe('S');
    expect(degToCompass8(270)).toBe('W');
    expect(degToCompass8(359)).toBe('N'); // wraps
    expect(degToCompass8(-90)).toBe('W'); // normalises negatives
  });
});

describe('computeTerrain', () => {
  // Grid is row-major, north row first.
  it('a slope that is high to the north faces south (downhill)', () => {
    const z = [10, 10, 10, 5, 5, 5, 0, 0, 0];
    const t = computeTerrain(z, 60, 60);
    expect(t.aspect).toBe('S');
    expect(t.aspectDeg).toBeCloseTo(180, 0);
    expect(t.slopeDeg).toBeGreaterThan(3);
    expect(t.landform).toBe('mid-slope');
  });

  it('a slope that is high to the west faces east', () => {
    const z = [10, 5, 0, 10, 5, 0, 10, 5, 0];
    const t = computeTerrain(z, 60, 60);
    expect(t.aspect).toBe('E');
    expect(t.aspectDeg).toBeCloseTo(90, 0);
  });

  it('a central peak is a ridge with no aspect', () => {
    const z = [0, 0, 0, 0, 10, 0, 0, 0, 0];
    const t = computeTerrain(z, 60, 60);
    expect(t.landform).toBe('ridge/upper-slope');
    expect(t.aspect).toBeNull();
  });

  it('a central low point is a gully/valley', () => {
    const z = [10, 10, 10, 10, 0, 10, 10, 10, 10];
    const t = computeTerrain(z, 60, 60);
    expect(t.landform).toBe('gully/valley');
  });

  it('a flat plane is flat with no aspect', () => {
    const z = [5, 5, 5, 5, 5, 5, 5, 5, 5];
    const t = computeTerrain(z, 60, 60);
    expect(t.slopeDeg).toBeCloseTo(0, 5);
    expect(t.aspect).toBeNull();
    expect(t.landform).toBe('flat/plain');
  });

  it('rejects a grid that is not 9 cells', () => {
    expect(() => computeTerrain([1, 2, 3], 60, 60)).toThrow();
  });
});

describe('gridAround', () => {
  it('centres the grid and orders it north row first', () => {
    const { points } = gridAround(-33, 151, 60);
    expect(points).toHaveLength(9);
    // Centre (index 4) is the input point.
    expect(points[4].lat).toBeCloseTo(-33, 6);
    expect(points[4].lng).toBeCloseTo(151, 6);
    // North row (index 1) is further north than the south row (index 7).
    expect(points[1].lat).toBeGreaterThan(points[7].lat);
    // West col (index 3) is further west than east col (index 5).
    expect(points[3].lng).toBeLessThan(points[5].lng);
  });
});

describe('hemisphere-aware interpretation', () => {
  it('reads hemisphere from latitude', () => {
    expect(hemisphereOf(-33)).toBe('southern');
    expect(hemisphereOf(40)).toBe('northern');
  });

  it('sun-facing aspect flips by hemisphere', () => {
    expect(sunFacingBearing('southern')).toBe(0); // faces north
    expect(sunFacingBearing('northern')).toBe(180); // faces south
  });

  it('angleBetween is symmetric and wraps', () => {
    expect(angleBetween(350, 10)).toBe(20);
    expect(angleBetween(10, 350)).toBe(20);
    expect(angleBetween(0, 180)).toBe(180);
  });

  it('classifies exposure correctly for the southern hemisphere', () => {
    expect(exposureOf(0, 'southern')).toBe('sun-facing'); // north-facing
    expect(exposureOf(180, 'southern')).toBe('shade-facing'); // south-facing
    expect(exposureOf(90, 'southern')).toBe('neutral'); // east-facing
  });

  it('classifies exposure correctly for the northern hemisphere', () => {
    expect(exposureOf(180, 'northern')).toBe('sun-facing'); // south-facing
    expect(exposureOf(0, 'northern')).toBe('shade-facing'); // north-facing
  });

  it('describes a southern-hemisphere north slope as sun-facing', () => {
    const text = describeAspect('N', 0, 'southern');
    expect(text).toContain('north-facing');
    expect(text).toContain('sun-facing');
  });
});

describe('resolveRegion', () => {
  it('resolves Australian coordinates to AU', () => {
    expect(resolveRegion({ lat: -33.87, lng: 151.2 })).toBe('AU'); // Sydney
    expect(resolveRegion({ lat: -42.88, lng: 147.33 })).toBe('AU'); // Hobart
  });

  it('resolves elsewhere to global', () => {
    expect(resolveRegion({ lat: 51.5, lng: -0.12 })).toBe('global'); // London
    expect(resolveRegion({ lat: -41.3, lng: 174.8 })).toBe('global'); // Wellington (NZ)
  });
});

describe('approximateRectangle', () => {
  function rect(lat0: number, lng0: number, ewM: number, nsM: number): PolygonGeometry {
    const mPerLat = 111_320;
    const mPerLng = 111_320 * Math.cos((lat0 * Math.PI) / 180);
    const dLng = ewM / 2 / mPerLng;
    const dLat = nsM / 2 / mPerLat;
    return {
      type: 'Polygon',
      coordinates: [[
        [lng0 - dLng, lat0 - dLat],
        [lng0 + dLng, lat0 - dLat],
        [lng0 + dLng, lat0 + dLat],
        [lng0 - dLng, lat0 + dLat],
        [lng0 - dLng, lat0 - dLat],
      ]],
    };
  }

  it('reads a long east-west strip as long × narrow, axis E–W', () => {
    const r = approximateRectangle(rect(-27, 153, 100, 20))!;
    expect(r.lengthM).toBeGreaterThanOrEqual(96);
    expect(r.lengthM).toBeLessThanOrEqual(104);
    expect(r.widthM).toBeGreaterThanOrEqual(17);
    expect(r.widthM).toBeLessThanOrEqual(23);
    expect(Math.abs(r.bearingDeg - 90)).toBeLessThanOrEqual(5); // E–W axis
  });

  it('reads a square as roughly equal sides', () => {
    const r = approximateRectangle(rect(-27, 153, 50, 50))!;
    expect(Math.abs(r.lengthM - r.widthM)).toBeLessThanOrEqual(4);
  });

  it('returns null for a degenerate ring', () => {
    expect(approximateRectangle({ type: 'Polygon', coordinates: [[[0, 0]]] })).toBeNull();
  });
});

describe('approximateShape', () => {
  const lat0 = -27;
  const lng0 = 153;
  const mPerLat = 111_320;
  const mPerLng = 111_320 * Math.cos((lat0 * Math.PI) / 180);
  const toLngLat = (xm: number, ym: number): [number, number] => [
    lng0 + xm / mPerLng,
    lat0 + ym / mPerLat,
  ];

  it('classifies a near-circular polygon as a circle', () => {
    const ring: [number, number][] = [];
    const r = 50;
    for (let i = 0; i <= 32; i++) {
      const a = (2 * Math.PI * i) / 32;
      ring.push(toLngLat(r * Math.cos(a), r * Math.sin(a)));
    }
    const s = approximateShape({ type: 'Polygon', coordinates: [ring] })!;
    expect(s.kind).toBe('circle');
    expect(Math.abs((s.diameterM ?? 0) - 100)).toBeLessThanOrEqual(6);
  });

  it('classifies a right triangle as a triangle', () => {
    const ring = [toLngLat(0, 0), toLngLat(100, 0), toLngLat(0, 40), toLngLat(0, 0)];
    const s = approximateShape({ type: 'Polygon', coordinates: [ring] })!;
    expect(s.kind).toBe('triangle');
    expect(s.baseM).toBeGreaterThanOrEqual(96);
    expect(s.heightM).toBeGreaterThanOrEqual(36);
  });

  it('classifies a filled rectangle as a rectangle', () => {
    const ring = [
      toLngLat(-50, -10),
      toLngLat(50, -10),
      toLngLat(50, 10),
      toLngLat(-50, 10),
      toLngLat(-50, -10),
    ];
    const s = approximateShape({ type: 'Polygon', coordinates: [ring] })!;
    expect(s.kind).toBe('rectangle');
    expect(s.lengthM).toBeGreaterThanOrEqual(96);
  });
});

describe('classifyTexture', () => {
  it('classifies common mixes', () => {
    expect(classifyTexture(90, 5, 5)).toBe('sand');
    expect(classifyTexture(20, 20, 60)).toBe('clay');
    expect(classifyTexture(60, 25, 15)).toBe('sandy loam');
    expect(classifyTexture(10, 60, 30)).toBe('clay loam');
  });
});
