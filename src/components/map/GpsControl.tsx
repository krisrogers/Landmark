import { useMemo } from 'react';
import { Circle, CircleMarker } from 'react-leaflet';
import { useGeolocation } from '@/hooks';
import { useMapStore } from '@/store';

export function GpsControl() {
  // Circle and CircleMarker components get their context from MapContainer automatically
  const { showGpsLocation } = useMapStore();
  // Watch continuously while the GPS layer is on so the dot tracks the user as
  // they move. Watching stops automatically when the layer is toggled off.
  const { latitude, longitude, accuracy } = useGeolocation({ watch: showGpsLocation });

  const position = useMemo(() => {
    if (latitude != null && longitude != null) {
      return [latitude, longitude] as [number, number];
    }
    return null;
  }, [latitude, longitude]);

  if (!showGpsLocation || !position) {
    return null;
  }

  return (
    <>
      {/* Accuracy circle — drawn whenever we have an accuracy estimate. A
          tighter fix simply yields a smaller circle. */}
      {accuracy != null && accuracy > 0 && (
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
