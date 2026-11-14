/**
 * Bring-your-own-key transport: calls Anthropic directly from the browser with
 * the user's own API key. The SDK is dynamically imported so it stays out of
 * the main bundle until the first advice request. `dangerouslyAllowBrowser` is
 * intentional here — it is the user's own key on their own device.
 */
import type AnthropicNS from '@anthropic-ai/sdk';
import type { AdviceRequest, AdvisorCallOptions, AdvisorTransport } from '../types';
import { AdvisorError } from '../types';
import { ADVISOR_SYSTEM_PROMPT, buildUserPrompt } from '../prompt';

const MAX_TOKENS = 4096;

export const byoKeyTransport: AdvisorTransport = {
  async getAdvice(req: AdviceRequest, opts: AdvisorCallOptions): Promise<string> {
    if (!opts.apiKey.trim()) {
      throw new AdvisorError('config', 'No API key configured.');
    }

    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const client: AnthropicNS = new Anthropic({
      apiKey: opts.apiKey,
      dangerouslyAllowBrowser: true,
      defaultHeaders: { 'anthropic-dangerous-direct-browser-access': 'true' },
      maxRetries: 2,
    });

    try {
      const message = await client.messages.create(
        {
          model: opts.model,
          max_tokens: MAX_TOKENS,
          system: ADVISOR_SYSTEM_PROMPT,
          messages: [{ role: 'user', content: buildUserPrompt(req) }],
        },
        { signal: opts.signal, timeout: 120_000 }
      );

      if (message.stop_reason === 'refusal') {
        throw new AdvisorError(
          'refusal',
          'The model declined to answer this request. Try rephrasing your objective.'
        );
      }

      const text = message.content
        .filter((b): b is Extract<typeof b, { type: 'text' }> => b.type === 'text')
        .map((b) => b.text)
        .join('')
        .trim();

      if (!text) {
        throw new AdvisorError('unknown', 'The model returned an empty response.');
      }
      return text;
    } catch (err) {
      throw toAdvisorError(err, Anthropic);
    }
  },
};

function toAdvisorError(err: unknown, Anthropic: typeof AnthropicNS): AdvisorError {
  if (err instanceof AdvisorError) return err;

  // Abort is not a failure to report — surface it for the caller to detect.
  if (err instanceof Error && err.name.includes('Abort')) {
    const e = new AdvisorError('network', 'Request cancelled.');
    e.name = 'AbortError';
    return e;
  }

  if (err instanceof Anthropic.AuthenticationError) {
    return new AdvisorError('auth', 'Your API key was rejected. Check it in Settings.');
  }
  if (err instanceof Anthropic.PermissionDeniedError) {
    return new AdvisorError('auth', 'This API key is not permitted to make this request.');
  }
  if (err instanceof Anthropic.RateLimitError) {
    return new AdvisorError('rate_limit', 'Rate limited — wait a moment and try again.');
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return new AdvisorError('network', 'Could not reach Anthropic — check your connection.');
  }
  if (err instanceof Anthropic.APIError) {
    return new AdvisorError('unknown', `API error${err.status ? ` (${err.status})` : ''}: ${err.message}`);
  }
  return new AdvisorError('unknown', err instanceof Error ? err.message : 'Unknown error.');
}
