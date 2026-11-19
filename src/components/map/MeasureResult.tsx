import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMapStore, useFeatureStore, useAIStore, hasAI } from '@/store';
import { prefetchSiteContext } from '@/services/region';
import { formatArea, formatDistance } from '@/services/geo';

/**
 * Shown after a measurement is completed (via draw). Presents the result and
 * lets the user keep it as a Place or discard it as a throwaway measurement.
 */
export function MeasureResult() {
  const navigate = useNavigate();
  const { pendingMeasure, setPendingMeasure } = useMapStore();
  const { createFeature } = useFeatureStore();
  const [busy, setBusy] = useState(false);

  if (!pendingMeasure) return null;

  const isArea = pendingMeasure.geometryType === 'Polygon';
  const title = isArea ? 'Area' : 'Distance';
  const primary = isArea
    ? formatArea(pendingMeasure.area ?? 0)
    : formatDistance(pendingMeasure.length ?? 0);
  const secondary = isArea ? `Perimeter ${formatDistance(pendingMeasure.perimeter ?? 0)}` : null;

  const discard = () => setPendingMeasure(null);

  const save = async () => {
    setBusy(true);
    try {
      const feature = await createFeature({
        name: isArea ? 'New area' : 'New line',
        geometryType: pendingMeasure.geometryType,
        geometry: pendingMeasure.geometry,
        tags: [],
      });
      // Warm the advisor's context cache while we (likely) still have signal.
      if (hasAI(useAIStore.getState())) void prefetchSiteContext(feature);
      setPendingMeasure(null);
      navigate(`/feature/${feature.id}?edit=true`);
    } catch (err) {
      console.error('Failed to save measurement:', err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1100] w-[calc(100%-2rem)] max-w-sm">
      <div className="bg-white rounded-2xl shadow-xl p-4">
        <div className="text-xs font-extrabold uppercase tracking-wide text-stone-400">{title}</div>
        <div className="flex items-baseline gap-2 mt-0.5">
          <span className="text-2xl font-bold text-stone-900">{primary}</span>
          {secondary && <span className="text-sm text-stone-500">{secondary}</span>}
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={discard}
            className="flex-1 h-11 rounded-xl bg-stone-100 text-stone-700 font-bold"
          >
            Discard
          </button>
          <button
            onClick={save}
            disabled={busy}
            className="flex-1 h-11 rounded-xl bg-primary-600 text-white font-bold disabled:opacity-40"
          >
            Save as place
          </button>
        </div>
      </div>
    </div>
  );
}
