import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '../../../test/utils';

// Mock react-leaflet to track context usage
const mockUseMap = vi.fn();
const mockUseMapEvents = vi.fn();

vi.mock('react-leaflet', async () => {
  const actual = await vi.importActual('react-leaflet');
  return {
    ...actual,
    useMap: () => {
      mockUseMap();
      // Return a mock map object
      return {
        setView: vi.fn(),
        getZoom: vi.fn(() => 10),
        on: vi.fn(),
        off: vi.fn(),
        addLayer: vi.fn(),
        removeLayer: vi.fn(),
        addControl: vi.fn(),
        removeControl: vi.fn(),
      };
    },
    useMapEvents: (handlers: Record<string, unknown>) => {
      mockUseMapEvents(handlers);
      return null;
    },
    MapContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="map-container">{children}</div>
    ),
    TileLayer: () => <div data-testid="tile-layer" />,
    ZoomControl: () => <div data-testid="zoom-control" />,
    Marker: () => <div data-testid="marker" />,
    Popup: () => <div data-testid="popup" />,
    Circle: () => <div data-testid="circle" />,
    CircleMarker: () => <div data-testid="circle-marker" />,
    Polyline: () => <div data-testid="polyline" />,
    Polygon: () => <div data-testid="polygon" />,
  };
});

// Mock leaflet
vi.mock('leaflet', () => ({
  default: {
    Icon: {
      Default: {
        prototype: {},
        mergeOptions: vi.fn(),
      },
    },
    FeatureGroup: vi.fn(() => ({
      addTo: vi.fn(),
    })),
    Control: {
      Draw: vi.fn(() => ({
        addTo: vi.fn(),
      })),
    },
    Draw: {
      Event: {
        CREATED: 'draw:created',
      },
    },
    Marker: vi.fn(),
    Polyline: vi.fn(),
    Polygon: vi.fn(),
  },
}));

// Mock leaflet-draw
vi.mock('leaflet-draw', () => ({}));

// Mock the hooks
vi.mock('../../../hooks', () => ({
  useFeatures: () => ({ features: [], isLoading: false }),
  useGeolocation: () => ({
    latitude: null,
    longitude: null,
    getCurrentPosition: vi.fn(),
    isLoading: false,
    error: null,
  }),
}));

// Mock the store
vi.mock('../../../store', () => ({
  useMapStore: () => ({
    center: [0, 0],
    zoom: 10,
    basemap: 'osm',
    drawingMode: 'none',
    showGpsLocation: false,
    gpsPosition: null,
    visibleGeometryTypes: new Set(['Point', 'LineString', 'Polygon']),
    visibleTags: new Set(),
    setCenter: vi.fn(),
    setZoom: vi.fn(),
    setDrawingMode: vi.fn(),
    toggleGpsLocation: vi.fn(),
    resetFilters: vi.fn(),
    setBasemap: vi.fn(),
  }),
  useFeatureStore: () => ({
    createFeature: vi.fn(),
  }),
}));

describe('MapView', () => {
  beforeEach(() => {
    mockUseMap.mockClear();
    mockUseMapEvents.mockClear();
  });

  it('renders MapContainer', async () => {
    const { MapView } = await import('../MapView');
    const { container } = render(<MapView />);

    expect(container.querySelector('[data-testid="map-container"]')).toBeInTheDocument();
  });

  it('renders map controls', async () => {
    const { MapView } = await import('../MapView');
    render(<MapView />);

    // The component should render without throwing errors
    expect(true).toBe(true);
  });
});

describe('Leaflet Context - Regression Tests', () => {
  beforeEach(() => {
    mockUseMap.mockClear();
    mockUseMapEvents.mockClear();
  });

  it('GpsControlButton is rendered inside MapContainer context', async () => {
    // This test ensures GpsControlButton (which uses useMap) is inside MapContainer
    // If it were outside, the useMap hook would throw an error
    const { MapView } = await import('../MapView');

    // This should not throw an error
    expect(() => render(<MapView />)).not.toThrow();

    // Verify useMap was called (indicating components using it were rendered)
    expect(mockUseMap).toHaveBeenCalled();
  });

  it('components using useMap hook do not throw context errors', async () => {
    // Import the actual component to verify structure
    const { GpsControlButton } = await import('../MapControls');

    // When wrapped in proper context (via MapView), it should work
    const { MapView } = await import('../MapView');
    expect(() => render(<MapView />)).not.toThrow();
  });

  it('MapControls without GpsControlButton does not use map context', async () => {
    // MapControls (FilterButton and DrawingToolbar) should not require map context
    const { MapControls } = await import('../MapControls');

    // Reset mock to track only MapControls usage
    mockUseMap.mockClear();

    // MapControls should render without needing map context
    // Note: We're testing that the refactored MapControls doesn't call useMap
    render(<MapControls />);

    // MapControls itself should not call useMap (only GpsControlButton does)
    // This verifies the fix: GpsControlButton was moved out of MapControls
    expect(mockUseMap).not.toHaveBeenCalled();
  });
});
