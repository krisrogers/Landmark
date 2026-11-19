import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-draw';
import 'leaflet-draw/dist/leaflet.draw.css';
import { useMapStore } from '@/store';
import {
  createLineGeometry,
  createPolygonGeometry,
  calculateLineLength,
  calculatePolygonArea,
  calculatePerimeter,
} from '@/services/geo';

const MEASURE_COLOR = '#0ea5e9';

export function DrawingTools() {
  const map = useMap();
  const { drawingMode, setDrawingMode, setPendingMeasure } = useMapStore();
  const drawControlRef = useRef<L.Control.Draw | null>(null);
  const drawnItemsRef = useRef<L.FeatureGroup | null>(null);

  useEffect(() => {
    if (!drawnItemsRef.current) {
      drawnItemsRef.current = new L.FeatureGroup();
      map.addLayer(drawnItemsRef.current);
    }

    const handleDrawCreated = (e: L.LeafletEvent) => {
      const event = e as L.DrawEvents.Created;
      const layer = event.layer;

      try {
        if (layer instanceof L.Polygon) {
          const latLngs = (layer.getLatLngs() as L.LatLng[][])[0];
          const coordinates = latLngs.map((ll) => [ll.lng, ll.lat] as [number, number]);
          const geometry = createPolygonGeometry(coordinates);
          setPendingMeasure({
            geometryType: 'Polygon',
            geometry,
            area: calculatePolygonArea(geometry),
            perimeter: calculatePerimeter(geometry),
          });
        } else if (layer instanceof L.Polyline) {
          const latLngs = layer.getLatLngs() as L.LatLng[];
          const coordinates = latLngs.map((ll) => [ll.lng, ll.lat] as [number, number]);
          const geometry = createLineGeometry(coordinates);
          setPendingMeasure({
            geometryType: 'LineString',
            geometry,
            length: calculateLineLength(geometry),
          });
        }
      } catch (err) {
        console.error('Failed to measure:', err);
      } finally {
        setDrawingMode('none');
      }
    };

    map.on(L.Draw.Event.CREATED, handleDrawCreated);
    return () => {
      map.off(L.Draw.Event.CREATED, handleDrawCreated);
    };
  }, [map, setDrawingMode, setPendingMeasure]);

  useEffect(() => {
    if (drawControlRef.current) {
      map.removeControl(drawControlRef.current);
      drawControlRef.current = null;
    }

    if (drawingMode === 'none') return;

    const options: L.Control.DrawConstructorOptions = {
      position: 'topright',
      draw: {
        polyline:
          drawingMode === 'line'
            ? {
                showLength: true,
                metric: true,
                feet: false,
                shapeOptions: { color: MEASURE_COLOR, weight: 3 },
              }
            : false,
        polygon:
          drawingMode === 'polygon'
            ? {
                showArea: true,
                metric: true,
                allowIntersection: false,
                shapeOptions: {
                  color: MEASURE_COLOR,
                  weight: 2,
                  fillColor: MEASURE_COLOR,
                  fillOpacity: 0.2,
                },
              }
            : false,
        circle: false,
        rectangle: false,
        circlemarker: false,
        marker: false,
      },
      edit: {
        featureGroup: drawnItemsRef.current!,
        remove: false,
        edit: false,
      },
    };

    drawControlRef.current = new L.Control.Draw(options);
    map.addControl(drawControlRef.current);

    // Auto-start the relevant draw handler.
    setTimeout(() => {
      const selector =
        drawingMode === 'line' ? '.leaflet-draw-draw-polyline' : '.leaflet-draw-draw-polygon';
      const button = document.querySelector(selector) as HTMLElement | null;
      button?.click();
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
