import { useState, useEffect, useCallback } from 'react';
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

  const startWatching = useCallback(async () => {
    if (state.isWatching) return;

    setState((s) => ({ ...s, isWatching: true, error: null }));

    try {
      await Geolocation.watchPosition(
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
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setState((s) => ({
        ...s,
        isWatching: false,
        error: errorMessage,
      }));
      setGpsError(errorMessage);
    }
  }, [state.isWatching, enableHighAccuracy, timeout, maximumAge, setGpsPosition, setGpsError]);

  const stopWatching = useCallback(async () => {
    await Geolocation.clearWatch({ id: '' });
    setState((s) => ({ ...s, isWatching: false }));
  }, []);

  useEffect(() => {
    if (watch) {
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
