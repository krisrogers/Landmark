import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDatabase } from '@/hooks';
import { getAllFeatures } from '@/services/database/queries';
import {
  calculatePolygonArea,
  calculateLineLength,
  formatArea,
  formatDistance,
} from '@/services/geo';
import { LoadingSpinner } from '@/components/common';
import type { Feature, PolygonGeometry, LineStringGeometry } from '@/types';

/** A simple list of saved places, tap to open the detail. */
export function PlacesPage() {
  const { db, isReady } = useDatabase();
  const navigate = useNavigate();
  const [features, setFeatures] = useState<Feature[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!db) return;
    setIsLoading(true);
    try {
      const feats = await getAllFeatures(db);
      feats.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
      setFeatures(feats);
    } catch (err) {
      console.error('Failed to load places:', err);
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  useEffect(() => {
    if (isReady && db) load();
  }, [isReady, db, load]);

  return (
    <div className="h-full flex flex-col bg-stone-50">
      <header className="bg-white border-b border-stone-200 px-4 pt-3 pb-3 safe-top">
        <h1 className="text-2xl font-bold text-stone-900 tracking-tight">
          Places{features.length > 0 ? ` (${features.length})` : ''}
        </h1>
      </header>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : features.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <PlaceIcon large />
            <p className="text-stone-500 text-center font-medium mt-4">No places yet</p>
            <p className="text-stone-400 text-sm text-center mt-1">
              Measure or mark a place from the map to see it here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {features.map((f) => (
              <button
                key={f.id}
                onClick={() => navigate(`/feature/${f.id}`)}
                className="w-full flex items-center gap-3 px-4 py-3.5 bg-white text-left"
              >
                <div className="w-9 h-9 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center flex-none">
                  <PlaceIcon />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-stone-900 truncate">{f.name}</p>
                  <p className="text-xs text-stone-500 mt-0.5 truncate">
                    {sizeLabel(f)}
                    {f.tags.length > 0 && ` · ${f.tags.join(', ')}`}
                  </p>
                </div>
                <ChevronIcon />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function sizeLabel(f: Feature): string {
  if (f.geometryType === 'Polygon') {
    return `Area · ${formatArea(calculatePolygonArea(f.geometry as PolygonGeometry))}`;
  }
  if (f.geometryType === 'LineString') {
    return `Line · ${formatDistance(calculateLineLength(f.geometry as LineStringGeometry))}`;
  }
  return 'Point';
}

function PlaceIcon({ large }: { large?: boolean }) {
  return (
    <svg
      className={large ? 'w-16 h-16 text-stone-300' : 'w-5 h-5'}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.7 16.7L13.4 21a2 2 0 01-2.8 0l-4.3-4.3a8 8 0 1111.4 0z" />
      <circle cx="12" cy="11" r="2.5" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg className="w-5 h-5 text-stone-300 flex-none" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}
