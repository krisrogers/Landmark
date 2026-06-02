/**
 * Renders saved features (pins, paths, areas) on a MapLibre map as a single
 * GeoJSON source with data-driven styling: each feature carries its category
 * color in its properties.
 */
import { GeoJSONSource, Layer } from '@maplibre/maplibre-react-native';
import React, { useMemo } from 'react';

import { UncategorizedColor } from '@/constants/theme';
import type { Category, Feature } from '@/lib/types';

interface Props {
  features: Feature[];
  categories: Category[];
  onPressFeature: (feature: Feature) => void;
}

/** Property key carrying the feature id through GeoJSON press events. */
const FEATURE_ID_KEY = 'featureId';

export function FeatureOverlays({ features, categories, onPressFeature }: Props) {
  const collection = useMemo<GeoJSON.FeatureCollection>(() => {
    const colorByCategory = new Map(categories.map((c) => [c.id, c.color]));
    return {
      type: 'FeatureCollection',
      features: features.map((feature) => ({
        type: 'Feature',
        properties: {
          [FEATURE_ID_KEY]: feature.id,
          color:
            (feature.categoryId && colorByCategory.get(feature.categoryId)) ||
            UncategorizedColor,
        },
        geometry: feature.geometry,
      })),
    };
  }, [features, categories]);

  const handlePress = (event: { nativeEvent: { features: GeoJSON.Feature[] } }) => {
    const pressedId = event.nativeEvent.features[0]?.properties?.[FEATURE_ID_KEY];
    if (typeof pressedId !== 'string') return;
    const feature = features.find((f) => f.id === pressedId);
    if (feature) {
      onPressFeature(feature);
    }
  };

  return (
    <GeoJSONSource id="features" data={collection} onPress={handlePress}>
      {/* Area fills */}
      <Layer
        type="fill"
        id="feature-fills"
        filter={['==', ['geometry-type'], 'Polygon']}
        paint={{
          'fill-color': ['get', 'color'],
          'fill-opacity': 0.3,
        }}
      />
      {/* Area outlines and walked paths */}
      <Layer
        type="line"
        id="feature-lines"
        filter={['!=', ['geometry-type'], 'Point']}
        paint={{
          'line-color': ['get', 'color'],
          'line-width': 3,
        }}
      />
      {/* Pins */}
      <Layer
        type="circle"
        id="feature-points"
        filter={['==', ['geometry-type'], 'Point']}
        paint={{
          'circle-color': ['get', 'color'],
          'circle-radius': 9,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2.5,
        }}
      />
    </GeoJSONSource>
  );
}
