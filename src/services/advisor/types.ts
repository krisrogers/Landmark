import type { SiteBrief } from '@/services/region';

export interface AdviceRequest {
  brief: SiteBrief;
  /** The grower's objective, e.g. syntropic food production. */
  objective: string;
  /** Optional free-text notes about what's growing / conditions observed. */
  notes?: string;
}

export interface AdvisorCallOptions {
  apiKey: string;
  model: string;
  signal?: AbortSignal;
}

export type AdvisorErrorKind =
  | 'auth'
  | 'rate_limit'
  | 'refusal'
  | 'network'
  | 'config'
  | 'unknown';

export class AdvisorError extends Error {
  kind: AdvisorErrorKind;
  constructor(kind: AdvisorErrorKind, message: string) {
    super(message);
    this.name = 'AdvisorError';
    this.kind = kind;
  }
}

/**
 * Transport abstraction. Today the only implementation is bring-your-own-key
 * (direct browser → Anthropic). A hosted proxy for a paid tier can implement
 * this same interface later without touching the advisor feature.
 */
export interface AdvisorTransport {
  getAdvice(req: AdviceRequest, opts: AdvisorCallOptions): Promise<string>;
}
