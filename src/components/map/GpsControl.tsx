import { useMemo } from 'react';
import { Circle, CircleMarker } from 'react-leaflet';
import { useGeolocation } from '@/hooks';
import { useMapStore } from '@/store';

export function GpsControl() {
  // Circle and CircleMarker get their context from MapContainer automatically.
  const { showGpsLocation } = useMapStore();
  // Continuously watch position so accuracy refines as the GPS warms up,
  // rather than stopping at the first (often coarse) fix.
  const { latitude, longitude, accuracy } = useGeolocation({
    watch: showGpsLocation,
    enableHighAccuracy: true,
  });

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
