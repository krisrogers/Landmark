import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * AI / Advisor settings and the feature gate.
 *
 * This phase uses **bring-your-own-key**: the user's own Anthropic API key is
 * stored locally and the app calls Claude directly from the device. The key's
 * presence is what unlocks the gated "pro" tier for now — later the same
 * `tier` check can be backed by a real entitlement without touching feature code.
 *
 * Stored in localStorage only (never in the project DB / export).
 */

export type Tier = 'free' | 'pro';

/** Default model for the advisor. Claude Opus 5.5 — strong vision + reasoning. */
export const DEFAULT_ADVISOR_MODEL = 'claude-opus-5-5';

/** Prefilled objective so the advisor has a sensible starting intent. */
export const DEFAULT_OBJECTIVE =
  'Personal-to-commercial food production using a syntropic / permaculture system.';

interface AIState {
  /** The user's own Anthropic API key (BYO). Empty string = not configured. */
  apiKey: string;
  /** A default objective, editable per request in the advisor. */
  defaultObjective: string;
  /** Model id used for advisor calls. */
  model: string;

  setApiKey: (apiKey: string) => void;
  clearApiKey: () => void;
  setDefaultObjective: (objective: string) => void;
  setModel: (model: string) => void;
}

export const useAIStore = create<AIState>()(
  persist(
    (set) => ({
      apiKey: '',
      defaultObjective: DEFAULT_OBJECTIVE,
      model: DEFAULT_ADVISOR_MODEL,

      setApiKey: (apiKey) => set({ apiKey: apiKey.trim() }),
      clearApiKey: () => set({ apiKey: '' }),
      setDefaultObjective: (defaultObjective) => set({ defaultObjective }),
      setModel: (model) => set({ model }),
    }),
    {
      name: 'landmark-ai',
    }
  )
);

/** True when AI features are available (a BYO key is configured). */
export function hasAI(state: Pick<AIState, 'apiKey'>): boolean {
  return state.apiKey.trim().length > 0;
}

/** Current tier, derived from whether AI is unlocked. */
export function tierOf(state: Pick<AIState, 'apiKey'>): Tier {
  return hasAI(state) ? 'pro' : 'free';
}
