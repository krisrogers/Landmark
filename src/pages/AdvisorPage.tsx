import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useFeatureStore, useAIStore } from '@/store';
import { Button, TextArea, LoadingSpinner } from '@/components/common';
import { assembleSiteBrief, type SiteBrief } from '@/services/region';
import { getTransport, AdvisorError } from '@/services/advisor';
import type { Feature } from '@/types';
import { SiteBriefView } from '@/components/advisor/SiteBriefView';
import { Markdownish } from '@/components/advisor/Markdownish';

type Phase = 'idle' | 'reading' | 'thinking' | 'done' | 'error';

export function AdvisorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { features, loadFeatures } = useFeatureStore();
  const { apiKey, model, defaultObjective, setDefaultObjective } = useAIStore();

  const [feature, setFeature] = useState<Feature | null>(null);
  const [objective, setObjective] = useState(defaultObjective);
  const [notes, setNotes] = useState('');
  const [brief, setBrief] = useState<SiteBrief | null>(null);
  const [advice, setAdvice] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      let f = features.find((x) => x.id === id);
      if (!f) {
        await loadFeatures();
        f = useFeatureStore.getState().features.find((x) => x.id === id);
      }
      if (active) setFeature(f ?? null);
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Abort any in-flight request when leaving the page.
  useEffect(() => () => abortRef.current?.abort(), []);

  const hasKey = apiKey.trim().length > 0;

  async function run() {
    if (!feature) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setError('');
    setAdvice('');
    setPhase('reading');
    try {
      const assembled = await assembleSiteBrief(feature, controller.signal);
      if (controller.signal.aborted) return;
      setBrief(assembled);

      setPhase('thinking');
      const result = await getTransport().getAdvice(
        { brief: assembled, objective, notes },
        { apiKey, model, signal: controller.signal }
      );
      if (controller.signal.aborted) return;
      setAdvice(result);
      setPhase('done');
    } catch (err) {
      if (controller.signal.aborted || (err instanceof Error && err.name === 'AbortError')) return;
      setError(err instanceof AdvisorError ? err.message : 'Something went wrong getting advice.');
      setPhase('error');
    }
  }

  const header = (
    <header className="bg-white border-b border-stone-200 px-4 py-3 safe-top flex items-center gap-3">
      <button onClick={() => navigate(-1)} className="text-stone-500 hover:text-stone-800" aria-label="Back">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <div className="min-w-0">
        <h1 className="text-lg font-semibold text-stone-900 truncate">Planting advice</h1>
        {feature && <p className="text-sm text-stone-500 truncate">{feature.name}</p>}
      </div>
    </header>
  );

  if (!feature) {
    return (
      <div className="h-full flex flex-col bg-stone-50">
        {header}
        <div className="flex-1 flex items-center justify-center text-stone-500">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (!hasKey) {
    return (
      <div className="h-full flex flex-col bg-stone-50">
        {header}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="rounded-lg border border-stone-200 bg-white p-5 text-center max-w-md mx-auto mt-6">
            <h2 className="text-base font-semibold text-stone-900 mb-2">AI advisor is a Pro feature</h2>
            <p className="text-sm text-stone-600 mb-4">
              Add your own Anthropic API key in Settings to enable site-specific planting advice.
              Your key stays on this device and is billed to your own account.
            </p>
            <Link to="/settings">
              <Button>Open Settings</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const busy = phase === 'reading' || phase === 'thinking';

  return (
    <div className="h-full flex flex-col bg-stone-50">
      {header}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <TextArea
            label="Objective"
            rows={2}
            value={objective}
            onChange={(e) => {
              setObjective(e.target.value);
              setDefaultObjective(e.target.value);
            }}
            placeholder="What are you trying to achieve on this spot?"
          />
        </div>
        <div>
          <TextArea
            label="Notes (optional)"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What's growing here now? Anything you've observed — wet corner, existing trees, wind…"
          />
        </div>

        <Button onClick={run} isLoading={busy} disabled={busy} className="w-full">
          {phase === 'done' || phase === 'error' ? 'Get advice again' : 'Get advice'}
        </Button>

        {busy && (
          <p className="text-sm text-stone-500 text-center">
            {phase === 'reading' ? 'Reading the site (terrain, climate, soil)…' : 'Thinking about your site…'}
          </p>
        )}

        {brief && <SiteBriefView brief={brief} />}

        {phase === 'error' && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {advice && (
          <div className="rounded-lg border border-stone-200 bg-white p-4">
            <Markdownish text={advice} />
            <p className="mt-4 pt-3 border-t border-stone-100 text-xs text-stone-400">
              AI-generated advice — confirm local suitability, availability and any weed/biosecurity
              rules before planting.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
