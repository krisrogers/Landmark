import { useEffect, useRef, useCallback } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-draw';
import 'leaflet-draw/dist/leaflet.draw.css';
import { useMapStore, useFeatureStore, type DrawingMode } from '@/store';
import { createPointGeometry, createLineGeometry, createPolygonGeometry } from '@/services/geo';
import { useGeolocation } from '@/hooks';
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
  onAddPoint: () => void;
}

export function DrawingToolbar({ onAddPoint }: DrawingToolbarProps) {
  const { drawingMode, setDrawingMode } = useMapStore();
  const { latitude, longitude, getCurrentPosition, isLoading } = useGeolocation();
  const { createFeature } = useFeatureStore();
  const navigate = useNavigate();

  const handleAddPointAtLocation = async () => {
    try {
      let lat = latitude;
      let lng = longitude;

      if (!lat || !lng) {
        const position = await getCurrentPosition();
        lat = position.coords.latitude;
        lng = position.coords.longitude;
      }

      if (lat && lng) {
        const feature = await createFeature({
          name: 'New Point',
          geometryType: 'Point',
          geometry: createPointGeometry(lng, lat),
          tags: [],
        });

        navigate(`/feature/${feature.id}?edit=true`);
      }
    } catch (err) {
      console.error('Failed to get location:', err);
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
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white font-medium rounded-full hover:bg-primary-700 transition-colors min-h-touch"
          title="Add point at current location"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Drop Point
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
