import type { PolygonGeometry } from '@/types';

/**
 * Approximate an arbitrary polygon as a simple rectangle so advice can reason
 * about layout (rows, spacing) rather than just area. Uses the minimum-area
 * oriented bounding box of the convex hull — the tightest rectangle at the best
 * orientation — which captures "long and narrow" that area alone hides.
 */
export interface RectApprox {
  /** Longer side of the best-fit rectangle, metres. */
  lengthM: number;
  /** Shorter side, metres. */
  widthM: number;
  /** Compass bearing of the long axis, folded to 0–179° (an axis, not a direction). */
  bearingDeg: number;
}

interface Pt {
  x: number;
  y: number;
}

/** Andrew's monotone chain convex hull. Returns CCW hull without the closing point. */
function convexHull(points: Pt[]): Pt[] {
  const pts = points
    .slice()
    .sort((a, b) => a.x - b.x || a.y - b.y)
    .filter((p, i, arr) => i === 0 || p.x !== arr[i - 1].x || p.y !== arr[i - 1].y);
  if (pts.length < 3) return pts;

  const cross = (o: Pt, a: Pt, b: Pt) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

  const lower: Pt[] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }
  const upper: Pt[] = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

export function approximateRectangle(geometry: PolygonGeometry): RectApprox | null {
  const ring = geometry.coordinates[0];
  if (!ring || ring.length < 4) return null;

  // Project lon/lat to a local planar metric (metres east/north) around the centroid.
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
  const pts: Pt[] = ring.map(([lng, lat]) => ({
    x: (lng - lng0) * mPerLng,
    y: (lat - lat0) * mPerLat,
  }));

  const hull = convexHull(pts);
  if (hull.length < 3) return null;

  // The min-area rectangle has one side collinear with a hull edge: test each.
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
  const lengthM = Math.max(w, h);
  const widthM = Math.min(w, h);
  // Long-axis direction: along the edge if w is the longer side, else perpendicular.
  const longAngle = w >= h ? angle : angle + Math.PI / 2;
  // Convert math angle (CCW from +x/east) to a compass bearing (0=N, clockwise),
  // folded to 0–179° since an axis has no direction.
  const east = Math.cos(longAngle);
  const north = Math.sin(longAngle);
  let bearing = (Math.atan2(east, north) * 180) / Math.PI;
  bearing = ((bearing % 180) + 180) % 180;

  return { lengthM: Math.round(lengthM), widthM: Math.round(widthM), bearingDeg: Math.round(bearing) };
}
