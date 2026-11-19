import type { PolygonGeometry } from '@/types';

/**
 * Approximate an arbitrary polygon as the simple primitive it most resembles —
 * circle, triangle or rectangle — so advice can reason about layout (rows,
 * spacing, radial/wedge planting) rather than just area.
 *
 * Classification (all cheap, off the convex hull we already compute):
 *  - circularity = 4π·area / perimeter²  → high ⇒ circle
 *  - else fill = area / oriented-bbox-area → ~1 rectangle, ~0.5 triangle
 * Falls back to rectangle for anything irregular.
 */
export type ShapeKind = 'circle' | 'triangle' | 'rectangle';

export interface ShapeApprox {
  kind: ShapeKind;
  areaM2: number;
  /** Oriented-bbox long and short sides, metres (always present). */
  lengthM: number;
  widthM: number;
  /** Compass bearing of the long axis, 0–179° (not meaningful for a circle). */
  bearingDeg: number;
  diameterM?: number; // circle
  baseM?: number; // triangle
  heightM?: number; // triangle
}

/** Back-compat: just the best-fit rectangle (length × width + orientation). */
export interface RectApprox {
  lengthM: number;
  widthM: number;
  bearingDeg: number;
}

interface Pt {
  x: number;
  y: number;
}

function project(ring: number[][]): Pt[] {
  let latSum = 0;
  let lngSum = 0;
  for (const [lng, lat] of ring) {
    latSum += lat;
    lngSum += lng;
  }
  const lat0 = latSum / ring.length;
  const lng0 = lngSum / ring.length;
  const mPerLat = 111_320;
  const mPerLng = 111_320 * Math.cos((lat0 * Math.PI) / 180);
  return ring.map(([lng, lat]) => ({ x: (lng - lng0) * mPerLng, y: (lat - lat0) * mPerLat }));
}

/** Andrew's monotone chain convex hull (CCW, no closing point). */
function convexHull(points: Pt[]): Pt[] {
  const pts = points
    .slice()
    .sort((a, b) => a.x - b.x || a.y - b.y)
    .filter((p, i, arr) => i === 0 || p.x !== arr[i - 1].x || p.y !== arr[i - 1].y);
  if (pts.length < 3) return pts;
  const cross = (o: Pt, a: Pt, b: Pt) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower: Pt[] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: Pt[] = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

/** Minimum-area oriented bounding box of a hull → long side, short side, long-axis bearing. */
function minRect(hull: Pt[]): RectApprox | null {
  if (hull.length < 3) return null;
  let best: { area: number; w: number; h: number; angle: number } | null = null;
  for (let i = 0; i < hull.length; i++) {
    const a = hull[i];
    const b = hull[(i + 1) % hull.length];
    const edgeAngle = Math.atan2(b.y - a.y, b.x - a.x);
    const cos = Math.cos(-edgeAngle);
    const sin = Math.sin(-edgeAngle);
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const p of hull) {
      const rx = p.x * cos - p.y * sin;
      const ry = p.x * sin + p.y * cos;
      if (rx < minX) minX = rx;
      if (rx > maxX) maxX = rx;
      if (ry < minY) minY = ry;
      if (ry > maxY) maxY = ry;
    }
    const w = maxX - minX;
    const h = maxY - minY;
    const area = w * h;
    if (!best || area < best.area) best = { area, w, h, angle: edgeAngle };
  }
  if (!best) return null;
  const { w, h, angle } = best;
  const longAngle = w >= h ? angle : angle + Math.PI / 2;
  let bearing = (Math.atan2(Math.cos(longAngle), Math.sin(longAngle)) * 180) / Math.PI;
  bearing = ((bearing % 180) + 180) % 180;
  return { lengthM: Math.max(w, h), widthM: Math.min(w, h), bearingDeg: bearing };
}

/** Planar area (shoelace) and perimeter of a projected ring, in m² and m. */
function areaPerimeter(pts: Pt[]): { area: number; perimeter: number } {
  let area = 0;
  let perimeter = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    area += a.x * b.y - b.x * a.y;
    perimeter += Math.hypot(b.x - a.x, b.y - a.y);
  }
  return { area: Math.abs(area) / 2, perimeter };
}

export function approximateRectangle(geometry: PolygonGeometry): RectApprox | null {
  const ring = geometry.coordinates[0];
  if (!ring || ring.length < 4) return null;
  const rect = minRect(convexHull(project(ring)));
  if (!rect) return null;
  return {
    lengthM: Math.round(rect.lengthM),
    widthM: Math.round(rect.widthM),
    bearingDeg: Math.round(rect.bearingDeg),
  };
}

export function approximateShape(geometry: PolygonGeometry): ShapeApprox | null {
  const ring = geometry.coordinates[0];
  if (!ring || ring.length < 4) return null;
  const pts = project(ring);
  const rect = minRect(convexHull(pts));
  if (!rect) return null;
  const { area, perimeter } = areaPerimeter(pts);
  if (area <= 0 || perimeter <= 0) return null;

  const circularity = (4 * Math.PI * area) / (perimeter * perimeter);
  const bboxArea = rect.lengthM * rect.widthM;
  const fill = bboxArea > 0 ? area / bboxArea : 1;

  const base = {
    areaM2: Math.round(area),
    lengthM: Math.round(rect.lengthM),
    widthM: Math.round(rect.widthM),
    bearingDeg: Math.round(rect.bearingDeg),
  };

  if (circularity >= 0.85) {
    return { ...base, kind: 'circle', diameterM: Math.round(2 * Math.sqrt(area / Math.PI)) };
  }
  if (fill >= 0.4 && fill <= 0.62) {
    const baseM = rect.lengthM;
    return {
      ...base,
      kind: 'triangle',
      baseM: Math.round(baseM),
      heightM: Math.round((2 * area) / baseM),
    };
  }
  return { ...base, kind: 'rectangle' };
}
