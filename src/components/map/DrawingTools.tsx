import { useEffect, useRef, useState } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-draw';
import 'leaflet-draw/dist/leaflet.draw.css';
import { useMapStore, useFeatureStore } from '@/store';
import { createPointGeometry, createLineGeometry, createPolygonGeometry } from '@/services/geo';
import { useGeolocation, useWakeLock } from '@/hooks';
import { useNavigate } from 'react-router-dom';

export function DrawingTools() {
  const map = useMap();
  const { drawingMode, setDrawingMode } = useMapStore();
  const { createFeature } = useFeatureStore();
  const drawControlRef = useRef<L.Control.Draw | null>(null);
  const drawnItemsRef = useRef<L.FeatureGroup | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Initialize drawn items layer
    if (!drawnItemsRef.current) {
      drawnItemsRef.current = new L.FeatureGroup();
      map.addLayer(drawnItemsRef.current);
    }

    // Handle draw created event
    const handleDrawCreated = async (e: L.LeafletEvent) => {
      const event = e as L.DrawEvents.Created;
      const layer = event.layer;

      try {
        let geometry;
        let geometryType: 'Point' | 'LineString' | 'Polygon';

        if (layer instanceof L.Marker) {
          const latLng = layer.getLatLng();
          geometry = createPointGeometry(latLng.lng, latLng.lat);
          geometryType = 'Point';
        } else if (layer instanceof L.Polyline && !(layer instanceof L.Polygon)) {
          const latLngs = layer.getLatLngs() as L.LatLng[];
          const coordinates = latLngs.map((ll) => [ll.lng, ll.lat] as [number, number]);
          geometry = createLineGeometry(coordinates);
          geometryType = 'LineString';
        } else if (layer instanceof L.Polygon) {
          const latLngs = (layer.getLatLngs() as L.LatLng[][])[0];
          const coordinates = latLngs.map((ll) => [ll.lng, ll.lat] as [number, number]);
          geometry = createPolygonGeometry(coordinates);
          geometryType = 'Polygon';
        } else {
          return;
        }

        // Create feature with default name
        const feature = await createFeature({
          name: `New ${geometryType}`,
          geometryType,
          geometry,
          tags: [],
        });

        // Navigate to feature detail for editing
        navigate(`/feature/${feature.id}?edit=true`);
      } catch (err) {
        console.error('Failed to create feature:', err);
      } finally {
        setDrawingMode('none');
      }
    };

    map.on(L.Draw.Event.CREATED, handleDrawCreated);

    return () => {
      map.off(L.Draw.Event.CREATED, handleDrawCreated);
    };
  }, [map, createFeature, setDrawingMode, navigate]);

  useEffect(() => {
    // Clean up existing draw control
    if (drawControlRef.current) {
      map.removeControl(drawControlRef.current);
      drawControlRef.current = null;
    }

    if (drawingMode === 'none') return;

    // Create draw control based on mode
    const options: L.Control.DrawConstructorOptions = {
      position: 'topright',
      draw: {
        polyline: drawingMode === 'line' ? {
          shapeOptions: {
            color: '#16a34a',
            weight: 3,
          },
        } : false,
        polygon: drawingMode === 'polygon' ? {
          shapeOptions: {
            color: '#16a34a',
            weight: 2,
            fillColor: '#16a34a',
            fillOpacity: 0.2,
          },
        } : false,
        circle: false,
        rectangle: false,
        circlemarker: false,
        marker: drawingMode === 'point' ? {} : false,
      },
      edit: {
        featureGroup: drawnItemsRef.current!,
        remove: false,
        edit: false,
      },
    };

    drawControlRef.current = new L.Control.Draw(options);
    map.addControl(drawControlRef.current);

    // Automatically start drawing
    setTimeout(() => {
      const buttons = document.querySelectorAll('.leaflet-draw-draw-marker, .leaflet-draw-draw-polyline, .leaflet-draw-draw-polygon');
      const button = buttons[0] as HTMLElement;
      if (button) {
        button.click();
      }
    }, 100);

    return () => {
      if (drawControlRef.current) {
        map.removeControl(drawControlRef.current);
        drawControlRef.current = null;
      }
    };
  }, [map, drawingMode]);

  return null;
}

interface DrawingToolbarProps {
  onAddPoint?: () => void;
}

export function DrawingToolbar(_props: DrawingToolbarProps) {
  const { drawingMode, setDrawingMode } = useMapStore();
  const { getBestPosition } = useGeolocation();
  const { request: requestWakeLock, release: releaseWakeLock } = useWakeLock();
  const { createFeature } = useFeatureStore();
  const navigate = useNavigate();

  // Live accuracy (metres) shown while a GPS fix is settling; null when idle.
  const [captureAccuracy, setCaptureAccuracy] = useState<number | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const handleAddPointAtLocation = async () => {
    if (isCapturing) return;

    setIsCapturing(true);
    setCaptureAccuracy(null);
    // Keep the screen (and GPS) awake while the fix settles.
    await requestWakeLock();

    try {
      // Watch briefly and keep the most accurate fix rather than the first
      // (often coarse) reading. Surface live accuracy so the field user can
      // see the fix tightening before the point is saved.
      const position = await getBestPosition({
        desiredAccuracy: 10,
        maxWait: 15000,
        onProgress: (p) => setCaptureAccuracy(p.coords.accuracy ?? null),
      });

      const { latitude, longitude, accuracy } = position.coords;

      const feature = await createFeature({
        name: 'New Point',
        geometryType: 'Point',
        geometry: createPointGeometry(longitude, latitude),
        tags: [],
        properties: {
          gpsAccuracy: accuracy ?? null,
          capturedAt: position.timestamp ?? null,
        },
      });

      navigate(`/feature/${feature.id}?edit=true`);
    } catch (err) {
      console.error('Failed to get location:', err);
    } finally {
      await releaseWakeLock();
      setIsCapturing(false);
      setCaptureAccuracy(null);
    }
  };

  const isDrawing = drawingMode !== 'none';

  if (isDrawing) {
    return (
      <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-[1000]">
        <button
          onClick={() => setDrawingMode('none')}
          className="px-6 py-3 bg-red-600 text-white font-medium rounded-full shadow-lg hover:bg-red-700 transition-colors"
        >
          Cancel Drawing
        </button>
      </div>
    );
  }

  return (
    <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-[1000]">
      <div className="flex gap-2 bg-white rounded-full shadow-lg p-1">
        <button
          onClick={handleAddPointAtLocation}
          disabled={isCapturing}
          className={`flex items-center gap-2 px-4 py-2 bg-primary-600 text-white font-medium rounded-full hover:bg-primary-700 transition-colors min-h-touch ${
            isCapturing ? 'opacity-90 cursor-wait' : ''
          }`}
          title="Add point at current location"
        >
          {isCapturing ? (
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          )}
          {isCapturing
            ? captureAccuracy != null
              ? `Locating… ±${Math.round(captureAccuracy)} m`
              : 'Locating…'
            : 'Drop Point'}
        </button>

        <button
          onClick={() => setDrawingMode('line')}
          className="p-2 text-stone-600 hover:bg-stone-100 rounded-full transition-colors min-h-touch min-w-touch flex items-center justify-center"
          title="Draw line"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 20L20 4" />
          </svg>
        </button>

        <button
          onClick={() => setDrawingMode('polygon')}
          className="p-2 text-stone-600 hover:bg-stone-100 rounded-full transition-colors min-h-touch min-w-touch flex items-center justify-center"
          title="Draw polygon"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}
