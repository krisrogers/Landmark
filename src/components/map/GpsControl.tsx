import { useEffect, useMemo } from 'react';
import { Circle, CircleMarker, useMap } from 'react-leaflet';
import { useGeolocation } from '@/hooks';
import { useMapStore } from '@/store';

export function GpsControl() {
  const map = useMap();
  const { showGpsLocation, gpsPosition } = useMapStore();
  const { getCurrentPosition, isLoading, error, latitude, longitude, accuracy } = useGeolocation();

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

export function GpsButton() {
  const map = useMap();
  const { showGpsLocation, toggleGpsLocation } = useMapStore();
  const { getCurrentPosition, isLoading, error, latitude, longitude } = useGeolocation();

  const handleClick = async () => {
    if (!showGpsLocation) {
      toggleGpsLocation();
    }

    try {
      const position = await getCurrentPosition();
      if (position) {
        map.setView(
          [position.coords.latitude, position.coords.longitude],
          Math.max(map.getZoom(), 16)
        );
      }
    } catch (err) {
      // Error is handled in the hook
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={`
        p-3 bg-white rounded-lg shadow-md
        hover:bg-stone-50 active:bg-stone-100
        transition-colors min-h-touch min-w-touch
        flex items-center justify-center
        ${showGpsLocation ? 'text-primary-600' : 'text-stone-600'}
        ${isLoading ? 'animate-pulse' : ''}
      `}
      title={error || 'Center on my location'}
    >
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    </button>
  );
}
