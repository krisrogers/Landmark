import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, ZoomControl, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { differenceInCalendarDays, startOfDay } from 'date-fns';

import { useMapStore, useAssetStore, WORLD_CENTER, WORLD_ZOOM } from '@/store';
import { useFeatures, useDatabase } from '@/hooks';
import { getDueTasks } from '@/services/database/queries';
import { getApproxLocation } from '@/services/location';
import { FeatureLayer } from './FeatureLayer';
import { AssetLayer, type DueSeverity } from './AssetLayer';
import { GpsControl } from './GpsControl';
import { DrawingTools } from './DrawingTools';
import { WalkRecorder } from './WalkRecorder';
import { CaptureControls } from './CaptureControls';
import { BasemapSelector } from './BasemapSelector';
import { MapControls, GpsControlButton } from './MapControls';
import { GpsStatus } from './GpsStatus';

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
      const center = e.target.getCenter();
      setCenter([center.lat, center.lng]);
    },
    zoomend: (e) => setZoom(e.target.getZoom()),
  });
  return null;
}

function MapViewUpdater({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  const initializedRef = useRef(false);
  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      map.setView(center, zoom);
    }
  }, [map, center, zoom]);
  return null;
}

/**
 * On first run (no location established yet) picks a sensible map centre from an
 * approximate IP lookup — no GPS prompt. Falls back silently to the world view
 * already shown. Runs once; the GPS button still gives pin-point accuracy.
 */
function AutoLocate() {
  const map = useMap();
  const { hasLocated, setLocated, setView } = useMapStore();
  const ranRef = useRef(false);

  useEffect(() => {
    if (hasLocated || ranRef.current) return;
    ranRef.current = true;
    let cancelled = false;
    (async () => {
      const loc = await getApproxLocation();
      if (!cancelled && loc) {
        map.setView([loc.lat, loc.lng], 12);
        setView([loc.lat, loc.lng], 12);
      }
      if (!cancelled) setLocated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [hasLocated, map, setLocated, setView]);

  return null;
}

interface BasemapLayerProps {
  type: 'osm' | 'satellite' | 'none';
}

function BasemapLayer({ type }: BasemapLayerProps) {
  if (type === 'none') return null;
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

/** Build a map of subjectId → due severity from open reminder-bearing tasks. */
function useDueBySubject(): Map<string, DueSeverity> {
  const { db, isReady } = useDatabase();
  const [map, setMap] = useState<Map<string, DueSeverity>>(new Map());

  useEffect(() => {
    if (!isReady || !db) return;
    let cancelled = false;
    (async () => {
      try {
        const tasks = await getDueTasks(db);
        const today = startOfDay(new Date());
        const result = new Map<string, DueSeverity>();
        for (const t of tasks) {
          const subjectId = t.subjectId ?? t.featureId;
          if (!subjectId) continue;
          const eff = t.snoozedUntil ?? t.reminderDate;
          if (!eff) continue;
          const days = differenceInCalendarDays(startOfDay(eff), today);
          const severity: DueSeverity | null = days < 0 ? 'overdue' : days <= 30 ? 'due' : null;
          if (!severity) continue;
          const existing = result.get(subjectId);
          if (existing === 'overdue') continue; // overdue wins
          result.set(subjectId, severity);
        }
        if (!cancelled) setMap(result);
      } catch (err) {
        console.error('Failed to load due indicators:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [db, isReady]);

  return map;
}

export function MapView() {
  const { center, zoom, basemap, hasLocated } = useMapStore();
  const { features, isLoading } = useFeatures();
  const { assets, loadAssets } = useAssetStore();
  const dueBySubject = useDueBySubject();

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  // Until a real location is established, open on a world overview rather than
  // a persisted null-island/ocean centre.
  const initialCenter = hasLocated ? center : WORLD_CENTER;
  const initialZoom = hasLocated ? zoom : WORLD_ZOOM;

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={initialCenter}
        zoom={initialZoom}
        zoomControl={false}
        className="h-full w-full"
        attributionControl={true}
      >
        <MapEvents />
        <MapViewUpdater center={initialCenter} zoom={initialZoom} />
        <AutoLocate />
        <ZoomControl position="bottomright" />
        <BasemapLayer type={basemap} />
        <FeatureLayer features={features} isLoading={isLoading} dueBySubject={dueBySubject} />
        <AssetLayer assets={assets} features={features} dueBySubject={dueBySubject} />
        <WalkRecorder />
        <GpsControl />
        <DrawingTools />
        <GpsControlButton />
      </MapContainer>

      <MapControls />
      <BasemapSelector />
      <CaptureControls />
      <GpsStatus />
    </div>
  );
}
