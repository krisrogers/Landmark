/**
 * Renders saved features (pins, paths, areas) on the map.
 */
import React from 'react';
import { Marker, Polygon, Polyline } from 'react-native-maps';

import { UncategorizedColor } from '@/constants/theme';
import { geometryCenter, geometryToLatLngs } from '@/lib/geo';
import type { Category, Feature } from '@/lib/types';

interface Props {
  features: Feature[];
  categories: Category[];
  onPressFeature: (feature: Feature) => void;
}

function colorFor(feature: Feature, categories: Category[]): string {
  const category = categories.find((c) => c.id === feature.categoryId);
  return category?.color ?? UncategorizedColor;
}

/** Adds an alpha channel to a hex color. */
function withAlpha(hexColor: string, alpha: number): string {
  const a = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hexColor}${a}`;
}

export function FeatureOverlays({ features, categories, onPressFeature }: Props) {
  return (
    <>
      {features.map((feature) => {
        const color = colorFor(feature, categories);
        const coords = geometryToLatLngs(feature.geometry);

        switch (feature.geometry.type) {
          case 'Point':
            return (
              <Marker
                key={feature.id}
                coordinate={coords[0]}
                pinColor={color}
                title={feature.name}
                onCalloutPress={() => onPressFeature(feature)}
              />
            );
          case 'LineString':
            return (
              <Polyline
                key={feature.id}
                coordinates={coords}
                strokeColor={color}
                strokeWidth={4}
                tappable
                onPress={() => onPressFeature(feature)}
              />
            );
          case 'Polygon':
            return (
              <React.Fragment key={feature.id}>
                <Polygon
                  coordinates={coords}
                  strokeColor={color}
                  fillColor={withAlpha(color, 0.25)}
                  strokeWidth={3}
                  tappable
                  onPress={() => onPressFeature(feature)}
                />
                <Marker
                  coordinate={geometryCenter(feature.geometry)}
                  pinColor={color}
                  title={feature.name}
                  onCalloutPress={() => onPressFeature(feature)}
                />
              </React.Fragment>
            );
        }
      })}
    </>
  );
}
