import { useMapStore } from '@/store';
import { useGeolocation } from '@/hooks';

/**
 * A compact pill at the top of the map that shows what the GPS is doing:
 * searching, locked (with accuracy), or failed. Tapping it (re)requests a fix.
 */
export function GpsStatus() {
  const { gpsStatus, gpsAccuracy, showGpsLocation } = useMapStore();
  const { getCurrentPosition } = useGeolocation();

  // Nothing to show before any request and while GPS display is off.
  if (gpsStatus === 'idle' && !showGpsLocation) return null;

  const retry = () => {
    getCurrentPosition().catch(() => {});
  };

  if (gpsStatus === 'locating') {
    return (
      <Pill>
        <span className="w-3.5 h-3.5 rounded-full border-2 border-stone-300 border-t-primary-600 animate-spin" />
        <span className="text-stone-600">Finding your location…</span>
      </Pill>
    );
  }

  if (gpsStatus === 'locked') {
    const acc = gpsAccuracy != null ? `±${Math.round(gpsAccuracy)} m` : 'on';
    return (
      <Pill onClick={retry}>
        <span className="relative flex w-3 h-3">
          <span className="absolute inline-flex w-full h-full rounded-full bg-primary-500 opacity-40 animate-ping" />
          <span className="relative inline-flex w-3 h-3 rounded-full bg-primary-600 border-2 border-white" />
        </span>
        <span className="text-stone-700 font-semibold">GPS {acc}</span>
      </Pill>
    );
  }

  if (gpsStatus === 'error') {
    return (
      <Pill onClick={retry}>
        <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L14.7 3.9a2 2 0 00-3.4 0z" />
        </svg>
        <span className="text-amber-700 font-semibold">Location unavailable</span>
        <span className="text-stone-400">· tap to retry</span>
      </Pill>
    );
  }

  return null;
}

function Pill({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] safe-top">
      <button
        onClick={onClick}
        disabled={!onClick}
        className="flex items-center gap-2 bg-white/95 backdrop-blur border border-stone-200 rounded-full pl-2.5 pr-3.5 py-1.5 shadow-md text-[13px] disabled:cursor-default"
      >
        {children}
      </button>
    </div>
  );
}
