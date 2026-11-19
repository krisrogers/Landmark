import { useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, Polyline, CircleMarker, useMap } from 'react-leaflet';
import type L from 'leaflet';
import { getGeometryBounds, getGeometryCenter } from '@/services/geo';
import type { Feature, PolygonGeometry, LineStringGeometry, PointGeometry } from '@/types';

const ACCENT = '#0ea5e9';

/** Zoom/pan to frame the feature once the map is ready. */
function FitToFeature({ feature }: { feature: Feature }) {
  const map = useMap();
  useEffect(() => {
    const bounds = getGeometryBounds(feature.geometry) as L.LatLngBoundsExpression;
    map.fitBounds(bounds, { padding: [28, 28], maxZoom: 18, animate: false });
  }, [feature, map]);
  return null;
}

function Geometry({ feature }: { feature: Feature }) {
  if (feature.geometryType === 'Polygon') {
    const rings = (feature.geometry as PolygonGeometry).coordinates.map((ring) =>
      ring.map((c) => [c[1], c[0]] as [number, number])
    );
    return <Polygon positions={rings} pathOptions={{ color: ACCENT, weight: 2, fillOpacity: 0.25 }} />;
  }
  if (feature.geometryType === 'LineString') {
    const pts = (feature.geometry as LineStringGeometry).coordinates.map(
      (c) => [c[1], c[0]] as [number, number]
    );
    return <Polyline positions={pts} pathOptions={{ color: ACCENT, weight: 3 }} />;
  }
  const [lng, lat] = (feature.geometry as PointGeometry).coordinates;
  return (
    <CircleMarker
      center={[lat, lng]}
      radius={7}
      pathOptions={{ color: 'white', weight: 2, fillColor: ACCENT, fillOpacity: 1 }}
    />
  );
}

/** A small, static satellite preview of a place's shape in context. */
export function FeatureMiniMap({ feature }: { feature: Feature }) {
  const center = getGeometryCenter(feature.geometry);

  return (
    <div className="h-44 w-full bg-stone-200">
      <MapContainer
        center={center}
        zoom={16}
        className="h-full w-full"
        zoomControl={false}
        attributionControl={false}
        dragging={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        touchZoom={false}
        boxZoom={false}
        keyboard={false}
      >
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          maxNativeZoom={17}
          maxZoom={19}
        />
        <Geometry feature={feature} />
        <FitToFeature feature={feature} />
      </MapContainer>
    </div>
  );
}
