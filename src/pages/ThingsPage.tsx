import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDatabase } from '@/hooks';
import { getAllFeatures, getAllAssets } from '@/services/database/queries';
import { LoadingSpinner } from '@/components/common';
import type { Feature, Asset } from '@/types';

type Tab = 'places' | 'assets';

export function ThingsPage() {
  const { db, isReady } = useDatabase();
  const navigate = useNavigate();
  const [features, setFeatures] = useState<Feature[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('places');

  const load = useCallback(async () => {
    if (!db) return;
    setIsLoading(true);
    try {
      const [feats, asts] = await Promise.all([getAllFeatures(db), getAllAssets(db)]);
      setFeatures(feats);
      setAssets(asts);
    } catch (err) {
      console.error('Failed to load things:', err);
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  useEffect(() => {
    if (isReady && db) load();
  }, [isReady, db, load]);

  return (
    <div className="h-full flex flex-col bg-stone-50">
      <header className="bg-white border-b border-stone-200 px-4 pt-3 pb-2 safe-top">
        <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Things</h1>
        <div className="flex bg-stone-100 rounded-lg p-0.5 mt-3 w-fit">
          {(['places', 'assets'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-md text-sm font-semibold capitalize transition-colors ${
                tab === t ? 'bg-white text-primary-700 shadow-sm' : 'text-stone-500'
              }`}
            >
              {t} ({t === 'places' ? features.length : assets.length})
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : tab === 'places' ? (
          features.length === 0 ? (
            <EmptyState label="No places yet" hint="Mark a place from the map to see it here" />
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
                    <p className="text-xs text-stone-500 mt-0.5">
                      Place · {f.geometryType}
                      {f.tags.length > 0 && ` · ${f.tags.join(', ')}`}
                    </p>
                  </div>
                  <ChevronIcon />
                </button>
              ))}
            </div>
          )
        ) : assets.length === 0 ? (
          <EmptyState label="No assets yet" hint="Add an asset from the map's + button" />
        ) : (
          <div className="divide-y divide-stone-100">
            {assets.map((a) => (
              <div key={a.id} className="w-full flex items-center gap-3 px-4 py-3.5 bg-white">
                <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center flex-none">
                  <AssetIcon />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-stone-900 truncate">{a.name}</p>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Asset{a.category ? ` · ${a.category}` : ''}
                    {a.tags.length > 0 && ` · ${a.tags.join(', ')}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ label, hint }: { label: string; hint: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <svg className="w-16 h-16 text-stone-300 mb-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
      <p className="text-stone-500 text-center font-medium">{label}</p>
      <p className="text-stone-400 text-sm text-center mt-1">{hint}</p>
    </div>
  );
}

function PlaceIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.7 16.7L13.4 21a2 2 0 01-2.8 0l-4.3-4.3a8 8 0 1111.4 0z" />
      <circle cx="12" cy="11" r="2.5" />
    </svg>
  );
}

function AssetIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg className="w-5 h-5 text-stone-400 flex-none" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}
