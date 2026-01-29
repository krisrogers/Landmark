import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, ZoomControl, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { useMapStore } from '@/store';
import { useFeatures } from '@/hooks';
import { FeatureLayer } from './FeatureLayer';
import { GpsControl } from './GpsControl';
import { DrawingTools } from './DrawingTools';
import { BasemapSelector } from './BasemapSelector';
import { MapControls, GpsControlButton } from './MapControls';

// Fix Leaflet default icon issue
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function MapEvents() {
  const { setCenter, setZoom } = useMapStore();

  useMapEvents({
    moveend: (e) => {
      const map = e.target;
      const center = map.getCenter();
      setCenter([center.lat, center.lng]);
    },
    zoomend: (e) => {
      const map = e.target;
      setZoom(map.getZoom());
    },
  });

  return null;
}

function MapViewUpdater() {
  const map = useMap();
  const { center, zoom } = useMapStore();
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      // On first render, set the initial view
      map.setView(center, zoom);
    }
  }, [map, center, zoom]);

  return null;
}

interface BasemapLayerProps {
  type: 'osm' | 'satellite' | 'none';
}

function BasemapLayer({ type }: BasemapLayerProps) {
  if (type === 'none') {
    return null;
  }

  if (type === 'satellite') {
    return (
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        attribution="Tiles &copy; Esri"
        maxZoom={19}
      />
    );
  }

  return (
    <TileLayer
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      maxZoom={19}
    />
  );
}

export function MapView() {
  const { center, zoom, basemap } = useMapStore();
  const { features, isLoading } = useFeatures();

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={center}
        zoom={zoom}
        zoomControl={false}
        className="h-full w-full"
        attributionControl={true}
      >
        <MapEvents />
        <MapViewUpdater />
        <ZoomControl position="bottomright" />
        <BasemapLayer type={basemap} />
        <FeatureLayer features={features} isLoading={isLoading} />
        <GpsControl />
        <DrawingTools />
        <GpsControlButton />
      </MapContainer>

      <MapControls />
      <BasemapSelector />
    </div>
  );
}
