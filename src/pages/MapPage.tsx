import { MapView } from '@/components/map';
import { useOfflineStatus } from '@/hooks';

console.log('[MapPage.tsx] Module loaded');

export function MapPage() {
  const { isOffline } = useOfflineStatus();

  console.log('[MapPage] Component rendering, isOffline:', isOffline);

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
