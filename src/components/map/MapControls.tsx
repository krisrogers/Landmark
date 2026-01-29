import { useMap } from 'react-leaflet';
import { useMapStore } from '@/store';
import { useGeolocation } from '@/hooks';
import { DrawingToolbar } from './DrawingTools';

export function MapControls() {
  return (
    <>
      <GpsControlButton />
      <FilterButton />
      <DrawingToolbar onAddPoint={() => {}} />
    </>
  );
}

function GpsControlButton() {
  const map = useMap();
  const { showGpsLocation, toggleGpsLocation } = useMapStore();
  const { getCurrentPosition, isLoading, error } = useGeolocation();

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
      // Error handled in hook
    }
  };

  return (
    <div className="absolute bottom-4 right-4 z-[1000]">
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
    </div>
  );
}

function FilterButton() {
  const { visibleGeometryTypes, visibleTags, resetFilters } = useMapStore();

  const hasFilters = visibleGeometryTypes.size < 3 || visibleTags.size > 0;

  return (
    <div className="absolute top-4 left-4 z-[1000]">
      <button
        onClick={resetFilters}
        className={`
          p-3 bg-white rounded-lg shadow-md
          hover:bg-stone-50 active:bg-stone-100
          transition-colors min-h-touch min-w-touch
          flex items-center justify-center
          ${hasFilters ? 'text-primary-600' : 'text-stone-600'}
        `}
        title="Filter features"
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
            d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
          />
        </svg>
        {hasFilters && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-primary-600 rounded-full" />
        )}
      </button>
    </div>
  );
}
