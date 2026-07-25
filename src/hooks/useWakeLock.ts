import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Screen Wake Lock helper.
 *
 * On the web, geolocation updates are throttled or suspended once the screen
 * turns off, so continuous field tracking needs the screen kept awake. This
 * hook wraps the Wake Lock API and transparently re-acquires the lock when the
 * tab returns to the foreground (browsers auto-release it on tab/visibility
 * change). On native Capacitor builds the OS keeps the GPS running, and the
 * API simply reports as unsupported — callers can ignore that safely.
 */
export function useWakeLock() {
  const sentinelRef = useRef<WakeLockSentinel | null>(null);
  // Tracks whether the caller *wants* the lock held, so we can re-acquire it
  // after the browser auto-releases on visibility change.
  const wantLockRef = useRef(false);
  const [isActive, setIsActive] = useState(false);

  const isSupported =
    typeof navigator !== 'undefined' && 'wakeLock' in navigator;

  const request = useCallback(async (): Promise<boolean> => {
    wantLockRef.current = true;
    if (!isSupported) return false;

    try {
      if (!sentinelRef.current) {
        const sentinel = await navigator.wakeLock.request('screen');
        sentinelRef.current = sentinel;
        setIsActive(true);
        sentinel.addEventListener('release', () => {
          sentinelRef.current = null;
          setIsActive(false);
        });
      }
      return true;
    } catch {
      // Denied (e.g. low battery) or transiently unavailable — not fatal.
      return false;
    }
  }, [isSupported]);

  const release = useCallback(async (): Promise<void> => {
    wantLockRef.current = false;
    const sentinel = sentinelRef.current;
    if (sentinel) {
      sentinelRef.current = null;
      setIsActive(false);
      try {
        await sentinel.release();
      } catch {
        /* already released */
      }
    }
  }, []);

  // Re-acquire when returning to the foreground, if the caller still wants it.
  useEffect(() => {
    if (!isSupported) return;

    const handleVisibilityChange = () => {
      if (
        document.visibilityState === 'visible' &&
        wantLockRef.current &&
        !sentinelRef.current
      ) {
        request();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isSupported, request]);

  // Release on unmount so the lock never outlives the component that wanted it.
  useEffect(() => {
    return () => {
      void release();
    };
  }, [release]);

  return { isSupported, isActive, request, release };
}
