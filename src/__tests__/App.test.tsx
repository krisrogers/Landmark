import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

// Create mock database instance
const mockDbInstance = {
  initialize: vi.fn().mockResolvedValue(undefined),
  query: vi.fn().mockResolvedValue({ values: [] }),
  run: vi.fn().mockResolvedValue({ changes: { changes: 0 } }),
};

// Mock the database service BEFORE importing App
vi.mock('../services/database', () => ({
  getDatabase: vi.fn(),
  getDatabaseSync: vi.fn(),
}));

// Mock react-leaflet (needed when app fully initializes and renders MapView)
vi.mock('react-leaflet', () => ({
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
  useMap: () => ({
    setView: vi.fn(),
    getZoom: vi.fn(() => 10),
    on: vi.fn(),
    off: vi.fn(),
    addLayer: vi.fn(),
    removeLayer: vi.fn(),
    addControl: vi.fn(),
    removeControl: vi.fn(),
  }),
  useMapEvents: () => null,
}));

// Mock leaflet
vi.mock('leaflet', () => ({
  default: {
    Icon: { Default: { prototype: {}, mergeOptions: vi.fn() } },
    FeatureGroup: vi.fn(() => ({ addTo: vi.fn() })),
    Control: { Draw: vi.fn(() => ({ addTo: vi.fn() })) },
    Draw: { Event: { CREATED: 'draw:created' } },
    Marker: vi.fn(),
    Polyline: vi.fn(),
    Polygon: vi.fn(),
  },
}));

vi.mock('leaflet-draw', () => ({}));

// Mock the hooks - all exports must be included
vi.mock('../hooks', () => ({
  useFeatures: () => ({ features: [], isLoading: false }),
  useFeature: () => ({ feature: null, isLoading: false }),
  useSelectedFeature: () => ({ feature: null, selectFeature: vi.fn() }),
  useGeolocation: () => ({
    latitude: null,
    longitude: null,
    getCurrentPosition: vi.fn(),
    isLoading: false,
    error: null,
  }),
  checkGeolocationPermission: vi.fn().mockResolvedValue('prompt'),
  requestGeolocationPermission: vi.fn().mockResolvedValue(true),
  useDatabase: () => ({
    db: mockDbInstance,
    isReady: true,
    error: null,
  }),
  useDatabaseQuery: () => ({
    data: [],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useOfflineStatus: () => ({ isOffline: false }),
}));

// Mock the store
vi.mock('../store', () => ({
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

// Import after mocks are set up
import App from '../App';
import { getDatabase, getDatabaseSync } from '../services/database';

const mockGetDatabase = vi.mocked(getDatabase);
const mockGetDatabaseSync = vi.mocked(getDatabaseSync);

function renderApp() {
  return render(
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
}

describe('App Initialization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDatabaseSync.mockReturnValue(null);
  });

  describe('Loading State', () => {
    it('shows "Initializing Landmark..." spinner on mount', () => {
      // Database never resolves - keeps app in loading state
      mockGetDatabase.mockReturnValue(new Promise(() => {}));

      renderApp();

      expect(screen.getByText('Initializing Landmark...')).toBeInTheDocument();
    });

    it('renders animated spinner SVG during initialization', () => {
      mockGetDatabase.mockReturnValue(new Promise(() => {}));

      const { container } = renderApp();

      const spinner = container.querySelector('svg.animate-spin');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveClass('w-12', 'h-12'); // lg size
    });

    it('displays full-screen overlay during initialization', () => {
      mockGetDatabase.mockReturnValue(new Promise(() => {}));

      const { container } = renderApp();

      const overlay = container.querySelector('.fixed.inset-0.z-50');
      expect(overlay).toBeInTheDocument();
    });
  });

  describe('Successful Initialization', () => {
    it('transitions from loading to main app after database initializes', async () => {
      mockGetDatabase.mockResolvedValue(mockDbInstance as any);
      mockGetDatabaseSync.mockReturnValue(mockDbInstance as any);

      renderApp();

      // Initially shows loading
      expect(screen.getByText('Initializing Landmark...')).toBeInTheDocument();

      // After initialization, loading disappears and navigation appears
      await waitFor(() => {
        expect(screen.queryByText('Initializing Landmark...')).not.toBeInTheDocument();
      });

      expect(screen.getByText('Map')).toBeInTheDocument();
    });

    it('renders full navigation bar after initialization', async () => {
      mockGetDatabase.mockResolvedValue(mockDbInstance as any);
      mockGetDatabaseSync.mockReturnValue(mockDbInstance as any);

      renderApp();

      await waitFor(() => {
        expect(screen.getByText('Map')).toBeInTheDocument();
        expect(screen.getByText('Tasks')).toBeInTheDocument();
        expect(screen.getByText('Templates')).toBeInTheDocument();
        expect(screen.getByText('Settings')).toBeInTheDocument();
      });
    });

    it('renders map container on home route after initialization', async () => {
      mockGetDatabase.mockResolvedValue(mockDbInstance as any);
      mockGetDatabaseSync.mockReturnValue(mockDbInstance as any);

      const { container } = renderApp();

      await waitFor(() => {
        expect(container.querySelector('[data-testid="map-container"]')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('shows error UI when database initialization fails', async () => {
      mockGetDatabase.mockRejectedValue(new Error('Database connection failed'));

      renderApp();

      await waitFor(() => {
        expect(screen.getByText('Failed to Initialize')).toBeInTheDocument();
      });

      expect(screen.getByText('Database connection failed')).toBeInTheDocument();
    });

    it('hides loading spinner when error occurs', async () => {
      mockGetDatabase.mockRejectedValue(new Error('Init failed'));

      renderApp();

      await waitFor(() => {
        expect(screen.queryByText('Initializing Landmark...')).not.toBeInTheDocument();
      });
    });

    it('provides retry button on failure', async () => {
      mockGetDatabase.mockRejectedValue(new Error('Init failed'));

      renderApp();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });
  });
});
