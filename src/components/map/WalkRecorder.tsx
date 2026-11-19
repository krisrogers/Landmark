import { useEffect } from 'react';
import { Polyline, CircleMarker } from 'react-leaflet';
import { useMapStore } from '@/store';
import { useGeolocation } from '@/hooks';

/**
 * Active only while a walk-to-trace recording is in progress. Watches GPS,
 * appends each new position to the store, and draws the track so far.
 * Rendered inside the MapContainer.
 */
export function WalkRecorder() {
  const { isWalking, walkPoints, addWalkPoint } = useMapStore();
  const { latitude, longitude } = useGeolocation({ watch: isWalking, enableHighAccuracy: true });

  useEffect(() => {
    if (isWalking && latitude != null && longitude != null) {
      addWalkPoint([latitude, longitude]);
    }
  }, [isWalking, latitude, longitude, addWalkPoint]);

  if (!isWalking || walkPoints.length === 0) return null;

  return (
    <>
      <Polyline
        positions={walkPoints}
        pathOptions={{ color: '#0ea5e9', weight: 4, opacity: 0.9, dashArray: '6 6' }}
      />
      <CircleMarker
        center={walkPoints[0]}
        radius={6}
        pathOptions={{ color: '#ffffff', weight: 2, fillColor: '#16a34a', fillOpacity: 1 }}
      />
      <CircleMarker
        center={walkPoints[walkPoints.length - 1]}
        radius={6}
        pathOptions={{ color: '#ffffff', weight: 2, fillColor: '#0ea5e9', fillOpacity: 1 }}
      />
    </>
  );
}
