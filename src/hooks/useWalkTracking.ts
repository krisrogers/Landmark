/**
 * GPS breadcrumb tracking for walking out paths and area boundaries.
 *
 * Works in the foreground (screen on – kept awake automatically while
 * tracking). Background tracking needs a development build and can come in a
 * later increment.
 */
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';

import { pathLengthMeters, type LatLng } from '@/lib/geo';

/** Ignore fixes with worse accuracy than this (meters). */
const MAX_ACCURACY_M = 25;
/** Minimum distance between recorded breadcrumbs (meters). */
const MIN_STEP_M = 3;

const KEEP_AWAKE_TAG = 'walk-tracking';

export type TrackingStatus = 'idle' | 'starting' | 'tracking';

interface WalkTracking {
  status: TrackingStatus;
  /** Breadcrumbs recorded so far. */
  points: LatLng[];
  /** Total distance walked, in meters. */
  distanceMeters: number;
  /** Last GPS accuracy reading, in meters. */
  accuracy: number | null;
  start: () => Promise<boolean>;
  /** Stops tracking and returns the recorded points. */
  stop: () => LatLng[];
  cancel: () => void;
}

export function useWalkTracking(): WalkTracking {
  const [status, setStatus] = useState<TrackingStatus>('idle');
  const [points, setPoints] = useState<LatLng[]>([]);
  const [accuracy, setAccuracy] = useState<number | null>(null);

  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const pointsRef = useRef<LatLng[]>([]);

  const cleanup = useCallback(() => {
    subscriptionRef.current?.remove();
    subscriptionRef.current = null;
    deactivateKeepAwake(KEEP_AWAKE_TAG);
  }, []);

  // Stop watching if the component using the hook unmounts mid-walk.
  useEffect(() => cleanup, [cleanup]);

  const start = useCallback(async (): Promise<boolean> => {
    const { status: permission } = await Location.requestForegroundPermissionsAsync();
    if (permission !== 'granted') {
      return false;
    }

    setStatus('starting');
    pointsRef.current = [];
    setPoints([]);
    setAccuracy(null);

    await activateKeepAwakeAsync(KEEP_AWAKE_TAG);

    subscriptionRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 1000,
        distanceInterval: 1,
      },
      (location) => {
        const fixAccuracy = location.coords.accuracy ?? null;
        setAccuracy(fixAccuracy);

        if (fixAccuracy !== null && fixAccuracy > MAX_ACCURACY_M) {
          return; // too imprecise – skip this fix
        }

        const next: LatLng = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };

        const previous = pointsRef.current[pointsRef.current.length - 1];
        if (previous && pathLengthMeters([previous, next]) < MIN_STEP_M) {
          return; // hasn't moved far enough to record a new breadcrumb
        }

        pointsRef.current = [...pointsRef.current, next];
        setPoints(pointsRef.current);
        setStatus('tracking');
      }
    );

    setStatus('tracking');
    return true;
  }, []);

  const stop = useCallback((): LatLng[] => {
    cleanup();
    setStatus('idle');
    return pointsRef.current;
  }, [cleanup]);

  const cancel = useCallback(() => {
    cleanup();
    pointsRef.current = [];
    setPoints([]);
    setStatus('idle');
  }, [cleanup]);

  return {
    status,
    points,
    distanceMeters: pathLengthMeters(points),
    accuracy,
    start,
    stop,
    cancel,
  };
}
