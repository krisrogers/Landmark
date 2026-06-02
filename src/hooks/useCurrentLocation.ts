/**
 * One-shot "where am I right now" with permission handling.
 */
import * as Location from 'expo-location';
import { useCallback, useState } from 'react';

import type { LatLng } from '@/lib/geo';

interface CurrentLocation {
  /** Requests permission (if needed) and returns the current position, or null if unavailable. */
  getCurrentPosition: () => Promise<LatLng | null>;
  busy: boolean;
}

export function useCurrentLocation(): CurrentLocation {
  const [busy, setBusy] = useState(false);

  const getCurrentPosition = useCallback(async (): Promise<LatLng | null> => {
    setBusy(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return null;
      }
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
    } catch {
      return null;
    } finally {
      setBusy(false);
    }
  }, []);

  return { getCurrentPosition, busy };
}
