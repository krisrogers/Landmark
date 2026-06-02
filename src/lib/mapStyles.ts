/**
 * MapLibre style definitions for the basemaps.
 *
 * Both are free-to-use raster tile sources that require no API key or account:
 * - Esri World Imagery for satellite view (the default)
 * - OpenStreetMap for a streets/labels view
 */
import type { StyleSpecification } from '@maplibre/maplibre-react-native';

export type BasemapKind = 'satellite' | 'streets';

export const SATELLITE_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    satellite: {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      maxzoom: 19,
      attribution: 'Esri, Maxar, Earthstar Geographics, and the GIS User Community',
    },
  },
  layers: [
    {
      id: 'satellite',
      type: 'raster',
      source: 'satellite',
    },
  ],
};

export const STREETS_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      maxzoom: 19,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [
    {
      id: 'osm',
      type: 'raster',
      source: 'osm',
    },
  ],
};

export function basemapStyle(kind: BasemapKind): StyleSpecification {
  return kind === 'satellite' ? SATELLITE_STYLE : STREETS_STYLE;
}
