import { describe, it, expect, vi, afterEach } from 'vitest';
import { getApproxLocation } from '../ipLocation';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function stubFetch(responses: Array<() => Promise<unknown> | never>) {
  let i = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      const next = responses[Math.min(i, responses.length - 1)];
      i += 1;
      const body = await next();
      return { ok: true, json: async () => body } as unknown as Response;
    })
  );
}

describe('getApproxLocation', () => {
  it('returns the first provider location when it resolves', async () => {
    stubFetch([async () => ({ latitude: 51.5, longitude: -0.12 })]);
    const loc = await getApproxLocation();
    expect(loc).toEqual({ lat: 51.5, lng: -0.12, source: 'ip' });
  });

  it('falls back to the next provider when the first fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockRejectedValueOnce(new Error('network'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, latitude: 40, longitude: -74 }),
        } as unknown as Response)
    );
    const loc = await getApproxLocation();
    expect(loc).toEqual({ lat: 40, lng: -74, source: 'ip' });
  });

  it('rejects a 0,0 null-island result and returns null', async () => {
    stubFetch([
      async () => ({ latitude: 0, longitude: 0 }),
      async () => ({ success: true, latitude: 0, longitude: 0 }),
    ]);
    const loc = await getApproxLocation();
    expect(loc).toBeNull();
  });

  it('returns null when the browser is offline', async () => {
    vi.stubGlobal('fetch', vi.fn());
    const spy = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const loc = await getApproxLocation();
    expect(loc).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
