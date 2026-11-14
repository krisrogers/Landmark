import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useFeatureStore, useAIStore } from '@/store';
import { Button, TextArea, LoadingSpinner } from '@/components/common';
import {
  assembleSiteBrief,
  type SiteBrief,
  type BriefStep,
  type BriefStepStatus,
} from '@/services/region';
import { getTransport, AdvisorError, buildSharePrompt } from '@/services/advisor';
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
  const [steps, setSteps] = useState<Record<BriefStep, BriefStepStatus | undefined>>({
    Terrain: undefined,
    Climate: undefined,
    Soil: undefined,
  });
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

  // Prefetch the site context as soon as the advisor opens (no key needed —
  // reading the site is just data), so both "Get advice" and "Open in Claude"
  // are ready while the user reads the screen / edits the objective.
  useEffect(() => {
    if (!feature) return;
    const controller = new AbortController();
    abortRef.current = controller;
    (async () => {
      try {
        await ensureBrief(controller);
      } catch {
        /* best-effort prefetch */
      } finally {
        if (!controller.signal.aborted) setPhase((p) => (p === 'reading' ? 'idle' : p));
      }
    })();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feature]);

  // Reuse a fully-read brief; otherwise read the site now (populating the cache).
  async function ensureBrief(controller: AbortController): Promise<SiteBrief | null> {
    if (brief && brief.unavailable.length === 0) return brief;
    setSteps({ Terrain: undefined, Climate: undefined, Soil: undefined });
    setPhase('reading');
    const assembled = await assembleSiteBrief(feature!, {
      signal: controller.signal,
      onProgress: (step, status) => setSteps((s) => ({ ...s, [step]: status })),
    });
    if (controller.signal.aborted) return null;
    setBrief(assembled);
    return assembled;
  }

  async function run() {
    if (!feature) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setError('');
    setAdvice('');
    try {
      const assembled = await ensureBrief(controller);
      if (!assembled || controller.signal.aborted) return;

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

  function cancel() {
    abortRef.current?.abort();
    setPhase('idle');
  }

  // No-API-key path: read the site, then hand the whole prompt to claude.ai
  // (uses the user's login, no credits). Clipboard copy is a backup in case the
  // URL is too long to carry the query param on some browsers.
  async function openInClaude() {
    if (!feature) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setError('');
    try {
      const assembled = await ensureBrief(controller);
      if (!assembled || controller.signal.aborted) return;
      setPhase('idle');
      const text = buildSharePrompt({ brief: assembled, objective, notes });
      try {
        await navigator.clipboard?.writeText(text);
      } catch {
        /* clipboard best-effort */
      }
      window.open('https://claude.ai/new?q=' + encodeURIComponent(text), '_blank', 'noopener');
    } catch (err) {
      if (controller.signal.aborted || (err instanceof Error && err.name === 'AbortError')) return;
      setError('Could not read the site to build the prompt.');
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
            label="What's already growing here?"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Existing canopy, mid-storey, shrubs, ground layer, weeds — and what you'd keep vs clear. The advisor assumes bare ground if this is blank, so it's worth a line."
          />
        </div>

        {busy ? (
          <div className="space-y-3">
            <div className="rounded-lg border border-stone-200 bg-white p-3 space-y-2">
              <p className="text-sm font-medium text-stone-700">
                {phase === 'reading' ? 'Reading the site…' : 'Thinking about your site…'}
              </p>
              <StepRow label="Terrain" status={steps.Terrain} />
              <StepRow label="Climate" status={steps.Climate} />
              <StepRow label="Soil" status={steps.Soil} />
              {phase === 'thinking' && (
                <div className="flex items-center gap-2 text-sm text-stone-600 pt-1">
                  <Spinner /> Asking the advisor… this can take 10–30s.
                </div>
              )}
            </div>
            <Button variant="secondary" onClick={cancel} className="w-full">
              Cancel
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {hasKey && (
              <Button onClick={run} className="w-full">
                {phase === 'done' || phase === 'error' ? 'Get advice again' : 'Get advice'}
              </Button>
            )}
            <Button
              variant={hasKey ? 'secondary' : 'primary'}
              onClick={openInClaude}
              className="w-full"
            >
              Open in Claude
            </Button>
            <p className="text-xs text-stone-500 text-center">
              {hasKey
                ? '“Open in Claude” sends the full prompt to claude.ai (your login, no credits) — also copied to your clipboard.'
                : 'No API key needed — “Open in Claude” sends the full prompt to claude.ai using your login. In-app advice needs a key in Settings.'}
            </p>
          </div>
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

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin text-stone-400" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

function StepRow({ label, status }: { label: string; status?: BriefStepStatus }) {
  let icon;
  let text = 'text-stone-500';
  if (status === 'ok') {
    icon = <span className="text-green-600">✓</span>;
    text = 'text-stone-800';
  } else if (status === 'unavailable') {
    icon = <span className="text-amber-500">—</span>;
    text = 'text-stone-400';
  } else if (status === 'loading') {
    icon = <Spinner />;
  } else {
    icon = <span className="text-stone-300">•</span>;
  }
  return (
    <div className={`flex items-center gap-2 text-sm ${text}`}>
      <span className="w-4 inline-flex justify-center">{icon}</span>
      {label}
      {status === 'unavailable' && <span className="text-xs text-stone-400">(couldn't read)</span>}
    </div>
  );
}
