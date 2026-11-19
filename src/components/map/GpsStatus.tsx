import { useState } from 'react';
import { useMapStore } from '@/store';
import { useGeolocation } from '@/hooks';

/**
 * Shows what the GPS is doing: searching, locked (with accuracy + quality),
 * or failed (with a specific reason). Tapping a locked pill reveals details
 * rather than silently re-requesting.
 */
export function GpsStatus() {
  const { gpsStatus, gpsAccuracy, gpsPosition, gpsError, gpsErrorKind, showGpsLocation } =
    useMapStore();
  const { getCurrentPosition } = useGeolocation();
  const [expanded, setExpanded] = useState(false);

  if (gpsStatus === 'idle' && !showGpsLocation) return null;

  const retry = () => getCurrentPosition().catch(() => {});

  if (gpsStatus === 'locating') {
    // Still trying (watch active) — no retry prompt; a transient timeout just
    // reads as a weaker signal rather than a failure.
    const searching =
      gpsErrorKind === 'timeout' || gpsErrorKind === 'unavailable'
        ? 'Weak signal — still searching…'
        : 'Finding your location…';
    return (
      <Shell>
        <Pill>
          <span className="w-3.5 h-3.5 rounded-full border-2 border-stone-300 border-t-primary-600 animate-spin" />
          <span className="text-stone-600">{searching}</span>
        </Pill>
      </Shell>
    );
  }

  if (gpsStatus === 'error') {
    // Only reached for a terminal error (permission denied), where retrying
    // (re-prompting) is the right action.
    return (
      <Shell>
        <Pill onClick={retry}>
          <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L14.7 3.9a2 2 0 00-3.4 0z" />
          </svg>
          <span className="text-amber-700 font-semibold">{friendlyError(gpsError)}</span>
          <span className="text-stone-400">· tap to retry</span>
        </Pill>
      </Shell>
    );
  }

  // locked
  const q = quality(gpsAccuracy);
  const accText = gpsAccuracy != null ? `±${Math.round(gpsAccuracy)} m` : 'on';
  const coords = gpsPosition?.coords;
  const updated = gpsPosition?.timestamp
    ? new Date(gpsPosition.timestamp).toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : null;

  return (
    <Shell>
      <Pill onClick={() => setExpanded((v) => !v)}>
        <span className="relative flex w-3 h-3">
          <span className="absolute inline-flex w-full h-full rounded-full bg-primary-500 opacity-40 animate-ping" />
          <span className="relative inline-flex w-3 h-3 rounded-full bg-primary-600 border-2 border-white" />
        </span>
        <span className="font-semibold text-stone-700">GPS {accText}</span>
        <span className={`text-xs font-bold ${q.className}`}>{q.label}</span>
        <svg
          className={`w-3.5 h-3.5 text-stone-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </Pill>

      {expanded && (
        <div className="mt-1.5 bg-white rounded-xl shadow-lg border border-stone-200 p-3 text-[13px] w-64 pointer-events-auto">
          <Row label="Accuracy" value={`${accText} · ${q.label}`} />
          {coords && (
            <Row label="Coordinates" value={`${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`} />
          )}
          {updated && <Row label="Updated" value={updated} />}
          {q.approximate && (
            <p className="text-xs text-stone-500 mt-1.5">
              Still refining — hold steady with a clear view of the sky and it should tighten.
            </p>
          )}
          <button
            onClick={retry}
            className="mt-2 w-full h-9 rounded-lg bg-stone-100 text-stone-700 font-bold text-[13px]"
          >
            Refresh
          </button>
        </div>
      )}
    </Shell>
  );
}

function quality(acc: number | null): { label: string; className: string; approximate: boolean } {
  if (acc == null) return { label: '', className: 'text-stone-400', approximate: false };
  if (acc <= 15) return { label: 'precise', className: 'text-primary-600', approximate: false };
  if (acc <= 50) return { label: 'good', className: 'text-primary-600', approximate: false };
  return { label: 'approximate', className: 'text-amber-600', approximate: true };
}

function friendlyError(msg: string | null): string {
  const m = (msg ?? '').toLowerCase();
  if (/denied|permission/.test(m)) return 'Location permission denied';
  if (/timeout|timed out/.test(m)) return 'Weak signal — still searching';
  if (/unavailable|position/.test(m)) return 'Location unavailable';
  return 'Location unavailable';
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] safe-top flex flex-col items-center">
      {children}
    </div>
  );
}

function Pill({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className="flex items-center gap-2 bg-white/95 backdrop-blur border border-stone-200 rounded-full pl-2.5 pr-3.5 py-1.5 shadow-md text-[13px] disabled:cursor-default"
    >
      {children}
    </button>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-0.5">
      <span className="text-stone-400">{label}</span>
      <span className="font-semibold text-stone-800">{value}</span>
    </div>
  );
}
