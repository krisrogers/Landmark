import { useEffect, useMemo } from 'react';
import { Circle, CircleMarker } from 'react-leaflet';
import { useGeolocation } from '@/hooks';
import { useMapStore } from '@/store';

export function GpsControl() {
  // Circle and CircleMarker components get their context from MapContainer automatically
  const { showGpsLocation, gpsPosition } = useMapStore();
  const { getCurrentPosition, latitude, longitude, accuracy } = useGeolocation();

  // Get initial position when component mounts
  useEffect(() => {
    if (showGpsLocation && !gpsPosition) {
      getCurrentPosition().catch(() => {
        // Error is handled in the hook
      });
    }
  }, [showGpsLocation, gpsPosition, getCurrentPosition]);

  const position = useMemo(() => {
    if (latitude && longitude) {
      return [latitude, longitude] as [number, number];
    }
    return null;
  }, [latitude, longitude]);

  if (!showGpsLocation || !position) {
    return null;
  }

  return (
    <>
      {/* Accuracy circle */}
      {accuracy && accuracy > 10 && (
        <Circle
          center={position}
          radius={accuracy}
          pathOptions={{
            color: '#0ea5e9',
            weight: 2,
            fillColor: '#0ea5e9',
            fillOpacity: 0.1,
          }}
        />
      )}

      {/* Position marker */}
      <CircleMarker
        center={position}
        radius={8}
        pathOptions={{
          color: '#ffffff',
          weight: 3,
          fillColor: '#0ea5e9',
          fillOpacity: 1,
        }}
      />
    </>
  );
}
