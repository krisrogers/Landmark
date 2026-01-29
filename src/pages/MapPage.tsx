import { MapView } from '@/components/map';
import { useOfflineStatus } from '@/hooks';

export function MapPage() {
  const { isOffline } = useOfflineStatus();

  return (
    <div className="h-full relative">
      {isOffline && (
        <div className="absolute top-0 left-0 right-0 z-[1001] bg-amber-500 text-white text-center py-1 text-sm font-medium">
          Offline Mode
        </div>
      )}
      <MapView />
    </div>
  );
}
