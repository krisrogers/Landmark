import * as turf from '@turf/turf';
import type { Feature as LandmarkFeature, FeatureGeometry, PointGeometry, LineStringGeometry, PolygonGeometry } from '@/types';

export function calculatePolygonArea(geometry: PolygonGeometry): number {
  const polygon = turf.polygon(geometry.coordinates);
  return turf.area(polygon); // Returns square meters
}

export function calculateLineLength(geometry: LineStringGeometry): number {
  const line = turf.lineString(geometry.coordinates);
  return turf.length(line, { units: 'meters' });
}

export function calculateDistanceBetweenPoints(
  point1: PointGeometry,
  point2: PointGeometry
): number {
  const from = turf.point(point1.coordinates);
  const to = turf.point(point2.coordinates);
  return turf.distance(from, to, { units: 'meters' });
}

export function calculatePerimeter(geometry: PolygonGeometry): number {
  const polygon = turf.polygon(geometry.coordinates);
  const line = turf.polygonToLine(polygon);

  if (line.type === 'Feature') {
    if (line.geometry.type === 'LineString') {
      return turf.length(line as turf.Feature<turf.LineString>, { units: 'meters' });
    }
    // MultiLineString - sum all lines
    const multiLine = line as turf.Feature<turf.MultiLineString>;
    return multiLine.geometry.coordinates.reduce((total: number, coords: [number, number][]) => {
      return total + turf.length(turf.lineString(coords), { units: 'meters' });
    }, 0);
  }

  return 0;
}

export function getGeometryCenter(geometry: FeatureGeometry): [number, number] {
  let feature: turf.Feature;

  switch (geometry.type) {
    case 'Point':
      return [geometry.coordinates[1], geometry.coordinates[0]]; // [lat, lng]
    case 'LineString':
      feature = turf.lineString(geometry.coordinates);
      break;
    case 'Polygon':
      feature = turf.polygon(geometry.coordinates);
      break;
  }

  const center = turf.centroid(feature);
  return [center.geometry.coordinates[1], center.geometry.coordinates[0]];
}

export function getFeaturesBounds(
  features: LandmarkFeature[]
): [[number, number], [number, number]] | null {
  let minLat = Infinity;
  let minLng = Infinity;
  let maxLat = -Infinity;
  let maxLng = -Infinity;

  const extend = (lng: number, lat: number) => {
    if (lat < minLat) minLat = lat;
    if (lng < minLng) minLng = lng;
    if (lat > maxLat) maxLat = lat;
    if (lng > maxLng) maxLng = lng;
  };

  for (const f of features) {
    switch (f.geometry.type) {
      case 'Point':
        extend(f.geometry.coordinates[0], f.geometry.coordinates[1]);
        break;
      case 'LineString':
        for (const [lng, lat] of f.geometry.coordinates) extend(lng, lat);
        break;
      case 'Polygon':
        for (const ring of f.geometry.coordinates) {
          for (const [lng, lat] of ring) extend(lng, lat);
        }
        break;
    }
  }

  if (!Number.isFinite(minLat)) return null;
  return [[minLat, minLng], [maxLat, maxLng]];
}

export function getGeometryBounds(geometry: FeatureGeometry): [[number, number], [number, number]] {
  let feature: turf.Feature;

  switch (geometry.type) {
    case 'Point':
      const lat = geometry.coordinates[1];
      const lng = geometry.coordinates[0];
      // Return small bounds around point
      return [[lat - 0.001, lng - 0.001], [lat + 0.001, lng + 0.001]];
    case 'LineString':
      feature = turf.lineString(geometry.coordinates);
      break;
    case 'Polygon':
      feature = turf.polygon(geometry.coordinates);
      break;
  }

  const bbox = turf.bbox(feature);
  // bbox is [minLng, minLat, maxLng, maxLat]
  return [[bbox[1], bbox[0]], [bbox[3], bbox[2]]];
}

export function formatArea(squareMeters: number, preferredUnits: 'metric' | 'imperial' = 'metric'): string {
  if (preferredUnits === 'imperial') {
    const acres = squareMeters * 0.000247105;
    if (acres >= 1) {
      return `${acres.toFixed(2)} acres`;
    }
    const sqFeet = squareMeters * 10.7639;
    return `${sqFeet.toFixed(0)} ft²`;
  }

  if (squareMeters >= 10000) {
    const hectares = squareMeters / 10000;
    return `${hectares.toFixed(2)} ha`;
  }

  return `${squareMeters.toFixed(0)} m²`;
}

export function formatDistance(meters: number, preferredUnits: 'metric' | 'imperial' = 'metric'): string {
  if (preferredUnits === 'imperial') {
    const feet = meters * 3.28084;
    if (feet >= 5280) {
      const miles = feet / 5280;
      return `${miles.toFixed(2)} mi`;
    }
    return `${feet.toFixed(0)} ft`;
  }

  if (meters >= 1000) {
    const km = meters / 1000;
    return `${km.toFixed(2)} km`;
  }

  return `${meters.toFixed(0)} m`;
}

export function isPointInPolygon(point: PointGeometry, polygon: PolygonGeometry): boolean {
  const pt = turf.point(point.coordinates);
  const poly = turf.polygon(polygon.coordinates);
  return turf.booleanPointInPolygon(pt, poly);
}
