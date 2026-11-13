import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMapStore, useFeatureStore, useAIStore, hasAI } from '@/store';
import { prefetchSiteContext } from '@/services/region';
import { useGeolocation } from '@/hooks';
import {
  createPointGeometry,
  createPolygonGeometry,
  calculatePolygonArea,
  formatArea,
} from '@/services/geo';

export function CaptureControls() {
  const navigate = useNavigate();
  const {
    drawingMode,
    setDrawingMode,
    isWalking,
    walkPoints,
    startWalk,
    clearWalk,
    captureOpen,
    setCaptureOpen,
  } = useMapStore();
  const { createFeature } = useFeatureStore();
  const { getCurrentPosition } = useGeolocation();
  const [busy, setBusy] = useState(false);

  const pointHere = async () => {
    setCaptureOpen(false);
    setBusy(true);
    try {
      const pos = await getCurrentPosition();
      const feature = await createFeature({
        name: 'New point',
        geometryType: 'Point',
        geometry: createPointGeometry(pos.coords.longitude, pos.coords.latitude),
        tags: [],
      });
      navigate(`/feature/${feature.id}?edit=true`);
    } catch (err) {
      console.error('Failed to add point:', err);
    } finally {
      setBusy(false);
    }
  };

  const beginWalk = () => {
    setCaptureOpen(false);
    startWalk();
    getCurrentPosition().catch(() => {});
  };

  const beginMeasure = (mode: 'line' | 'polygon') => {
    setCaptureOpen(false);
    setDrawingMode(mode);
  };

  const finishWalk = async () => {
    if (walkPoints.length < 3) return;
    setBusy(true);
    try {
      const coords = walkPoints.map(([lat, lng]) => [lng, lat] as [number, number]);
      const feature = await createFeature({
        name: 'New area',
        geometryType: 'Polygon',
        geometry: createPolygonGeometry(coords),
        tags: [],
      });
      // Warm the advisor's context cache while we (likely) still have signal.
      if (hasAI(useAIStore.getState())) void prefetchSiteContext(feature);
      clearWalk();
      navigate(`/feature/${feature.id}?edit=true`);
    } catch (err) {
      console.error('Failed to finish area:', err);
    } finally {
      setBusy(false);
    }
  };

  // --- Walk-recording overlay ---
  if (isWalking) {
    const area =
      walkPoints.length >= 3
        ? formatArea(
            calculatePolygonArea(
              createPolygonGeometry(walkPoints.map(([lat, lng]) => [lng, lat] as [number, number]))
            )
          )
        : null;
    return (
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] w-[calc(100%-2rem)] max-w-sm">
        <div className="bg-white rounded-2xl shadow-xl p-4">
          <div className="flex items-center gap-2 text-sky-600 font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-pulse" />
            Recording area
          </div>
          <p className="text-sm text-stone-500 mt-1">
            {walkPoints.length} points{area ? ` · ~${area}` : ' · walk the boundary'}
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={clearWalk}
              className="flex-1 h-11 rounded-xl bg-stone-100 text-stone-700 font-bold"
            >
              Cancel
            </button>
            <button
              onClick={finishWalk}
              disabled={walkPoints.length < 3 || busy}
              className="flex-1 h-11 rounded-xl bg-primary-600 text-white font-bold disabled:opacity-40"
            >
              Finish
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Drawing overlay ---
  if (drawingMode !== 'none') {
    return (
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000]">
        <button
          onClick={() => setDrawingMode('none')}
          className="px-6 py-3 bg-red-600 text-white font-semibold rounded-full shadow-lg"
        >
          Cancel drawing
        </button>
      </div>
    );
  }

  // --- Capture sheet (opened from the bottom toolbar's + button) ---
  return (
    <>
      {captureOpen && (
        <div className="absolute inset-0 z-[1200]">
          <div className="absolute inset-0 bg-black/40" onClick={() => setCaptureOpen(false)} />
          <div className="absolute left-0 right-0 bottom-0 bg-stone-50 rounded-t-3xl shadow-2xl pb-4 animate-slide-up">
            <div className="w-10 h-1.5 rounded-full bg-stone-300 mx-auto my-3" />
            <h2 className="px-4 text-xl font-extrabold tracking-tight text-stone-900">Add to the land</h2>

            <p className="px-4 pt-3 pb-1 text-xs font-extrabold text-stone-400 uppercase tracking-wide">
              Measure
            </p>
            <div className="bg-white mx-3 rounded-2xl border border-stone-200 overflow-hidden">
              <SheetOption
                title="Measure distance"
                subtitle="Tap points to measure a line's length"
                onClick={() => beginMeasure('line')}
                icon={<LineIcon />}
              />
              <Divider />
              <SheetOption
                title="Measure area"
                subtitle="Tap points to measure an area and perimeter"
                onClick={() => beginMeasure('polygon')}
                icon={<AreaIcon />}
              />
              <Divider />
              <SheetOption
                title="Walk an area"
                subtitle="Trace a boundary by walking it with GPS"
                onClick={beginWalk}
                icon={<WalkIcon />}
              />
            </div>

            <p className="px-4 pt-4 pb-1 text-xs font-extrabold text-stone-400 uppercase tracking-wide">
              Mark a place
            </p>
            <div className="bg-white mx-3 rounded-2xl border border-stone-200 overflow-hidden">
              <SheetOption
                title="Point here"
                subtitle="Drop a marker at your GPS location"
                onClick={pointHere}
                icon={<PinIcon />}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function SheetOption({
  title,
  subtitle,
  onClick,
  icon,
  tint = 'green',
}: {
  title: string;
  subtitle: string;
  onClick: () => void;
  icon: React.ReactNode;
  tint?: 'green' | 'sky' | 'stone';
}) {
  const tintClass =
    tint === 'sky'
      ? 'bg-sky-100 text-sky-700'
      : tint === 'stone'
      ? 'bg-stone-100 text-stone-600'
      : 'bg-primary-100 text-primary-700';
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 px-4 py-3 text-left">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-none ${tintClass}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-stone-900">{title}</div>
        <div className="text-[12.5px] text-stone-500 mt-0.5">{subtitle}</div>
      </div>
    </button>
  );
}

function Divider() {
  return <div className="h-px bg-stone-100 ml-[68px]" />;
}

function PinIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.7 16.7L13.4 21a2 2 0 01-2.8 0l-4.3-4.3a8 8 0 1111.4 0z" />
      <circle cx="12" cy="11" r="2.5" />
    </svg>
  );
}
function WalkIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <circle cx="6" cy="6" r="2.4" />
      <circle cx="18" cy="18" r="2.4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.2 7.5C13 9 11 13 8 14.5S12 20 15.6 16.5" />
    </svg>
  );
}
function LineIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 20L20 4" />
      <circle cx="4" cy="20" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="20" cy="4" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  );
}
function AreaIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 8l7-4 7 4v8l-7 4-7-4z" />
    </svg>
  );
}
