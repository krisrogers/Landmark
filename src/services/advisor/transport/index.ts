import type { AdvisorTransport } from '../types';
import { byoKeyTransport } from './byoKey';

/**
 * Pick the active advisor transport. Only bring-your-own-key exists in this
 * phase; a hosted proxy for a paid tier would be selected here later.
 */
export function getTransport(): AdvisorTransport {
  return byoKeyTransport;
}
