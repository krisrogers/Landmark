import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// Mock the map store so the hook doesn't pull in the database-backed stores.
const setGpsPosition = vi.fn();
const setGpsError = vi.fn();
vi.mock('@/store', () => ({
  useMapStore: () => ({ setGpsPosition, setGpsError }),
}));

// Mock the Capacitor geolocation plugin.
vi.mock('@capacitor/geolocation', () => ({
  Geolocation: {
    getCurrentPosition: vi.fn(),
    watchPosition: vi.fn(),
    clearWatch: vi.fn().mockResolvedValue(undefined),
  },
}));

import { useGeolocation } from '../useGeolocation';
import { Geolocation } from '@capacitor/geolocation';

const mockWatchPosition = vi.mocked(Geolocation.watchPosition);
const mockClearWatch = vi.mocked(Geolocation.clearWatch);

function makePosition(accuracy: number, lat = 1, lng = 2) {
  return {
    timestamp: 0,
    coords: {
      latitude: lat,
      longitude: lng,
      accuracy,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
    },
  } as any;
}

describe('useGeolocation — watch lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('clears the watch using the id returned by watchPosition', async () => {
    mockWatchPosition.mockResolvedValue('watch-123' as any);

    const { result } = renderHook(() => useGeolocation());

    await act(async () => {
      await result.current.startWatching();
    });

    expect(mockWatchPosition).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.stopWatching();
    });

    // The bug being guarded against: clearWatch must receive the real id,
    // never an empty string.
    expect(mockClearWatch).toHaveBeenCalledWith({ id: 'watch-123' });
  });

  it('does not start a second watch while one is already active', async () => {
    mockWatchPosition.mockResolvedValue('watch-abc' as any);

    const { result } = renderHook(() => useGeolocation());

    await act(async () => {
      await result.current.startWatching();
      await result.current.startWatching();
    });

    expect(mockWatchPosition).toHaveBeenCalledTimes(1);
  });

  it('requests high accuracy by default', async () => {
    mockWatchPosition.mockResolvedValue('watch-xyz' as any);

    const { result } = renderHook(() => useGeolocation());

    await act(async () => {
      await result.current.startWatching();
    });

    expect(mockWatchPosition).toHaveBeenCalledWith(
      expect.objectContaining({ enableHighAccuracy: true }),
      expect.any(Function)
    );
  });
});

describe('useGeolocation — getBestPosition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resolves early once a fix meets the desired accuracy', async () => {
    let cb: (pos: unknown, err?: unknown) => void = () => {};
    mockWatchPosition.mockImplementation((_opts: any, callback: any) => {
      cb = callback;
      return Promise.resolve('bw-1') as any;
    });

    const { result } = renderHook(() => useGeolocation());

    let best: any;
    await act(async () => {
      const p = result.current.getBestPosition({ desiredAccuracy: 10 });
      // Coarse fix first, then a good one.
      cb(makePosition(40));
      cb(makePosition(8));
      best = await p;
    });

    expect(best.coords.accuracy).toBe(8);
    // Watch must be torn down once we're done.
    expect(mockClearWatch).toHaveBeenCalledWith({ id: 'bw-1' });
  });

  it('reports intermediate fixes via onProgress and keeps the most accurate', async () => {
    let cb: (pos: unknown, err?: unknown) => void = () => {};
    mockWatchPosition.mockImplementation((_opts: any, callback: any) => {
      cb = callback;
      return Promise.resolve('bw-2') as any;
    });

    const onProgress = vi.fn();
    const { result } = renderHook(() => useGeolocation());

    let best: any;
    await act(async () => {
      const p = result.current.getBestPosition({ desiredAccuracy: 5, onProgress });
      cb(makePosition(30));
      cb(makePosition(12));
      cb(makePosition(4)); // meets desiredAccuracy -> resolves
      best = await p;
    });

    expect(onProgress).toHaveBeenCalledTimes(3);
    expect(best.coords.accuracy).toBe(4);
  });

  it('surfaces geolocation errors when no fix was obtained', async () => {
    let cb: (pos: unknown, err?: unknown) => void = () => {};
    mockWatchPosition.mockImplementation((_opts: any, callback: any) => {
      cb = callback;
      return Promise.resolve('bw-3') as any;
    });

    const { result } = renderHook(() => useGeolocation());

    await act(async () => {
      const p = result.current.getBestPosition();
      cb(null, new Error('Location unavailable'));
      await expect(p).rejects.toThrow('Location unavailable');
    });

    await waitFor(() => {
      expect(setGpsError).toHaveBeenCalledWith('Location unavailable');
    });
  });
});
