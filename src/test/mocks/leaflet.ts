import { vi } from 'vitest';

// Mock Leaflet map instance
export const mockMap = {
  setView: vi.fn().mockReturnThis(),
  getCenter: vi.fn().mockReturnValue({ lat: 0, lng: 0 }),
  getZoom: vi.fn().mockReturnValue(10),
  on: vi.fn().mockReturnThis(),
  off: vi.fn().mockReturnThis(),
  addLayer: vi.fn().mockReturnThis(),
  removeLayer: vi.fn().mockReturnThis(),
  addControl: vi.fn().mockReturnThis(),
  removeControl: vi.fn().mockReturnThis(),
  flyTo: vi.fn().mockReturnThis(),
  panTo: vi.fn().mockReturnThis(),
  fitBounds: vi.fn().mockReturnThis(),
  invalidateSize: vi.fn().mockReturnThis(),
};

// Mock useMap hook
export const mockUseMap = vi.fn(() => mockMap);

// Mock useMapEvents hook
export const mockUseMapEvents = vi.fn(() => null);

// Reset all mocks between tests
export function resetLeafletMocks() {
  mockUseMap.mockClear();
  mockUseMapEvents.mockClear();
  Object.values(mockMap).forEach((fn) => {
    if (typeof fn === 'function' && 'mockClear' in fn) {
      fn.mockClear();
    }
  });
}
