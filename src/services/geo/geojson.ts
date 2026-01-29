import type { FeatureGeometry, PointGeometry, LineStringGeometry, PolygonGeometry, Feature } from '@/types';

export function createPointGeometry(lng: number, lat: number): PointGeometry {
  return {
    type: 'Point',
    coordinates: [lng, lat],
  };
}

export function createLineGeometry(coordinates: [number, number][]): LineStringGeometry {
  return {
    type: 'LineString',
    coordinates,
  };
}

export function createPolygonGeometry(coordinates: [number, number][]): PolygonGeometry {
  // Ensure the polygon is closed
  const closed = [...coordinates];
  if (
    closed.length > 0 &&
    (closed[0][0] !== closed[closed.length - 1][0] ||
      closed[0][1] !== closed[closed.length - 1][1])
  ) {
    closed.push(closed[0]);
  }

  return {
    type: 'Polygon',
    coordinates: [closed],
  };
}

export function featureToGeoJSON(feature: Feature): GeoJSON.Feature {
  return {
    type: 'Feature',
    id: feature.id,
    geometry: feature.geometry as GeoJSON.Geometry,
    properties: {
      id: feature.id,
      name: feature.name,
      description: feature.description,
      templateId: feature.templateId,
      tags: feature.tags,
      ...feature.properties,
    },
  };
}

export function featuresToGeoJSON(features: Feature[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: features.map(featureToGeoJSON),
  };
}

export function geometryToLatLngs(geometry: FeatureGeometry): L.LatLngExpression | L.LatLngExpression[] | L.LatLngExpression[][] {
  switch (geometry.type) {
    case 'Point':
      return [geometry.coordinates[1], geometry.coordinates[0]] as L.LatLngExpression;
    case 'LineString':
      return geometry.coordinates.map(
        (coord) => [coord[1], coord[0]] as L.LatLngExpression
      );
    case 'Polygon':
      return geometry.coordinates.map((ring) =>
        ring.map((coord) => [coord[1], coord[0]] as L.LatLngExpression)
      );
  }
}

export function latLngToCoordinates(latLng: { lat: number; lng: number }): [number, number] {
  return [latLng.lng, latLng.lat];
}

export function coordinatesToLatLng(coordinates: [number, number]): { lat: number; lng: number } {
  return { lat: coordinates[1], lng: coordinates[0] };
}

export function validateGeometry(geometry: unknown): geometry is FeatureGeometry {
  if (!geometry || typeof geometry !== 'object') return false;

  const geo = geometry as Record<string, unknown>;

  if (!('type' in geo) || !('coordinates' in geo)) return false;

  switch (geo.type) {
    case 'Point':
      return (
        Array.isArray(geo.coordinates) &&
        geo.coordinates.length === 2 &&
        typeof geo.coordinates[0] === 'number' &&
        typeof geo.coordinates[1] === 'number'
      );

    case 'LineString':
      return (
        Array.isArray(geo.coordinates) &&
        geo.coordinates.length >= 2 &&
        geo.coordinates.every(
          (coord) =>
            Array.isArray(coord) &&
            coord.length === 2 &&
            typeof coord[0] === 'number' &&
            typeof coord[1] === 'number'
        )
      );

    case 'Polygon':
      return (
        Array.isArray(geo.coordinates) &&
        geo.coordinates.length >= 1 &&
        geo.coordinates.every(
          (ring) =>
            Array.isArray(ring) &&
            ring.length >= 4 &&
            ring.every(
              (coord) =>
                Array.isArray(coord) &&
                coord.length === 2 &&
                typeof coord[0] === 'number' &&
                typeof coord[1] === 'number'
            )
        )
      );

    default:
      return false;
  }
}
