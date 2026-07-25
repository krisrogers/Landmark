import { useState, useEffect, useCallback, useRef } from 'react';
import { Geolocation, type Position } from '@capacitor/geolocation';
import { isNative } from '@/utils/platform';
import { useMapStore } from '@/store';

interface GeolocationState {
  position: Position | null;
  error: string | null;
  isLoading: boolean;
  isWatching: boolean;
}

interface UseGeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  watch?: boolean;
}

/**
 * Options for {@link useGeolocation}'s `getBestPosition`.
 *
 * GPS fixes refine over time: the first reading is often a coarse
 * cell/wifi estimate that tightens to a true GPS fix over several seconds.
 * `getBestPosition` watches for a short window and keeps the most accurate
 * reading rather than accepting the first one.
 */
interface BestFixOptions {
  /** Resolve early once a fix at or below this accuracy (metres) arrives. */
  desiredAccuracy?: number;
  /** Overall cap (ms). When reached, resolves with the best fix seen so far. */
  maxWait?: number;
  /** Called on every intermediate fix so the UI can show a live accuracy readout. */
  onProgress?: (position: Position) => void;
}

export function useGeolocation(options: UseGeolocationOptions = {}) {
  const {
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 0,
    watch = false,
  } = options;

  const [state, setState] = useState<GeolocationState>({
    position: null,
    error: null,
    isLoading: false,
    isWatching: false,
  });

  // Holds the active watch id so it can actually be cleared. The Capacitor /
  // browser geolocation APIs return an id from watchPosition that MUST be
  // passed back to clearWatch; losing it leaks watchers (battery + jitter).
  const watchIdRef = useRef<string | null>(null);
  // Set when stopWatching is called while a watch is still being registered,
  // so we can clear it as soon as the id arrives.
  const stopRequestedRef = useRef(false);

  const { setGpsPosition, setGpsError } = useMapStore();

  const getCurrentPosition = useCallback(async () => {
    setState((s) => ({ ...s, isLoading: true, error: null }));

    try {
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy,
        timeout,
        maximumAge,
      });

      setState((s) => ({
        ...s,
        position,
        isLoading: false,
        error: null,
      }));

      // Update global store
      setGpsPosition(position as unknown as GeolocationPosition);

      return position;
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setState((s) => ({
        ...s,
        isLoading: false,
        error: errorMessage,
      }));
      setGpsError(errorMessage);
      throw err;
    }
  }, [enableHighAccuracy, timeout, maximumAge, setGpsPosition, setGpsError]);

  /**
   * Watch the GPS for a short window and resolve with the most accurate fix.
   *
   * Resolves early if a fix meeting `desiredAccuracy` arrives, otherwise
   * resolves at `maxWait` with the best fix seen. Rejects only if no fix at
   * all was obtained.
   */
  const getBestPosition = useCallback(
    (opts: BestFixOptions = {}): Promise<Position> => {
      const { desiredAccuracy = 10, maxWait = 15000, onProgress } = opts;

      setState((s) => ({ ...s, isLoading: true, error: null }));

      return new Promise<Position>((resolve, reject) => {
        let best: Position | null = null;
        let localWatchId: string | null = null;
        let settled = false;
        let timer: ReturnType<typeof setTimeout> | null = null;

        const cleanup = () => {
          if (timer) clearTimeout(timer);
          if (localWatchId) {
            Geolocation.clearWatch({ id: localWatchId }).catch(() => {
              /* nothing actionable if clearing fails */
            });
          }
        };

        const finish = (pos: Position | null, err?: unknown) => {
          if (settled) return;
          settled = true;
          cleanup();

          if (pos) {
            setState((s) => ({ ...s, position: pos, isLoading: false, error: null }));
            setGpsPosition(pos as unknown as GeolocationPosition);
            resolve(pos);
          } else {
            const errorMessage = getErrorMessage(err);
            setState((s) => ({ ...s, isLoading: false, error: errorMessage }));
            setGpsError(errorMessage);
            reject(err instanceof Error ? err : new Error(errorMessage));
          }
        };

        Geolocation.watchPosition(
          { enableHighAccuracy, timeout, maximumAge: 0 },
          (position, err) => {
            if (err) {
              // If we already have a usable fix, keep it rather than failing.
              if (best) finish(best);
              else finish(null, err);
              return;
            }

            if (!position) return;

            onProgress?.(position);
            setState((s) => ({ ...s, position, error: null }));
            setGpsPosition(position as unknown as GeolocationPosition);

            if (!best || position.coords.accuracy < best.coords.accuracy) {
              best = position;
            }

            if (best.coords.accuracy <= desiredAccuracy) {
              finish(best);
            }
          }
        )
          .then((id) => {
            localWatchId = id;
            // If the window already elapsed before the id arrived, clear now.
            if (settled) {
              Geolocation.clearWatch({ id }).catch(() => {});
            }
          })
          .catch((err) => finish(best, best ? undefined : err));

        timer = setTimeout(() => finish(best), maxWait);
      });
    },
    [enableHighAccuracy, timeout, setGpsPosition, setGpsError]
  );

  const startWatching = useCallback(async () => {
    if (watchIdRef.current) return;

    stopRequestedRef.current = false;
    setState((s) => ({ ...s, isWatching: true, error: null }));

    try {
      const id = await Geolocation.watchPosition(
        {
          enableHighAccuracy,
          timeout,
          maximumAge,
        },
        (position, err) => {
          if (err) {
            const errorMessage = getErrorMessage(err);
            setState((s) => ({ ...s, error: errorMessage }));
            setGpsError(errorMessage);
          } else if (position) {
            setState((s) => ({ ...s, position, error: null }));
            setGpsPosition(position as unknown as GeolocationPosition);
          }
        }
      );

      watchIdRef.current = id;

      // A stop was requested before the watch finished registering — honour it.
      if (stopRequestedRef.current) {
        stopRequestedRef.current = false;
        await Geolocation.clearWatch({ id });
        watchIdRef.current = null;
        setState((s) => ({ ...s, isWatching: false }));
      }
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setState((s) => ({
        ...s,
        isWatching: false,
        error: errorMessage,
      }));
      setGpsError(errorMessage);
    }
  }, [enableHighAccuracy, timeout, maximumAge, setGpsPosition, setGpsError]);

  const stopWatching = useCallback(async () => {
    if (watchIdRef.current) {
      const id = watchIdRef.current;
      watchIdRef.current = null;
      await Geolocation.clearWatch({ id });
    } else {
      // Watch may still be registering; flag it so startWatching clears it.
      stopRequestedRef.current = true;
    }
    setState((s) => ({ ...s, isWatching: false }));
  }, []);

  useEffect(() => {
    if (watch) {
      // Subscribing to the geolocation stream is exactly the external-system
      // synchronisation an effect is for; startWatching's internal setState is
      // the "isWatching" flag for that subscription, not a cascading render.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      startWatching();
    }

    return () => {
      if (watch) {
        stopWatching();
      }
    };
  }, [watch, startWatching, stopWatching]);

  return {
    ...state,
    getCurrentPosition,
    getBestPosition,
    startWatching,
    stopWatching,
    latitude: state.position?.coords.latitude,
    longitude: state.position?.coords.longitude,
    accuracy: state.position?.coords.accuracy,
  };
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message: unknown }).message);
  }

  return 'Unknown geolocation error';
}

export async function checkGeolocationPermission(): Promise<'granted' | 'denied' | 'prompt'> {
  if (isNative()) {
    const status = await Geolocation.checkPermissions();
    return status.location as 'granted' | 'denied' | 'prompt';
  }

  if ('permissions' in navigator) {
    const result = await navigator.permissions.query({ name: 'geolocation' });
    return result.state;
  }

  return 'prompt';
}

export async function requestGeolocationPermission(): Promise<boolean> {
  if (isNative()) {
    const status = await Geolocation.requestPermissions();
    return status.location === 'granted';
  }

  // For web, we need to actually request position to trigger permission prompt
  try {
    await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
    });
    return true;
  } catch {
    return false;
  }
}
