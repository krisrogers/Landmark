import { useMemo } from 'react';
import { Marker, Polyline, Polygon, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { Feature, PointGeometry, LineStringGeometry, PolygonGeometry } from '@/types';
import { useMapStore, useFeatureStore } from '@/store';
import { getGeometryCenter } from '@/services/geo';
import { useNavigate } from 'react-router-dom';

interface FeatureLayerProps {
  features: Feature[];
  isLoading: boolean;
}

export function FeatureLayer({ features, isLoading }: FeatureLayerProps) {
  const { visibleGeometryTypes, visibleTags } = useMapStore();
  const { selectedFeatureId, selectFeature } = useFeatureStore();
  const navigate = useNavigate();
  const map = useMap();

  const filteredFeatures = useMemo(() => {
    return features.filter((feature) => {
      // Filter by geometry type
      if (!visibleGeometryTypes.has(feature.geometryType)) {
        return false;
      }

      // Filter by tags (if any tags are selected, feature must have at least one)
      if (visibleTags.size > 0) {
        const hasMatchingTag = feature.tags.some((tag) => visibleTags.has(tag));
        if (!hasMatchingTag) {
          return false;
        }
      }

      return true;
    });
  }, [features, visibleGeometryTypes, visibleTags]);

  const handleFeatureClick = (feature: Feature) => {
    selectFeature(feature.id);

    // Center map on feature
    const center = getGeometryCenter(feature.geometry);
    map.setView(center, map.getZoom());
  };

  const handleViewDetails = (feature: Feature) => {
    navigate(`/feature/${feature.id}`);
  };

  if (isLoading) {
    return null;
  }

  return (
    <>
      {filteredFeatures.map((feature) => {
        const isSelected = feature.id === selectedFeatureId;

        switch (feature.geometryType) {
          case 'Point':
            return (
              <PointFeature
                key={feature.id}
                feature={feature}
                isSelected={isSelected}
                onClick={() => handleFeatureClick(feature)}
                onViewDetails={() => handleViewDetails(feature)}
              />
            );

          case 'LineString':
            return (
              <LineFeature
                key={feature.id}
                feature={feature}
                isSelected={isSelected}
                onClick={() => handleFeatureClick(feature)}
                onViewDetails={() => handleViewDetails(feature)}
              />
            );

          case 'Polygon':
            return (
              <PolygonFeature
                key={feature.id}
                feature={feature}
                isSelected={isSelected}
                onClick={() => handleFeatureClick(feature)}
                onViewDetails={() => handleViewDetails(feature)}
              />
            );

          default:
            return null;
        }
      })}
    </>
  );
}

interface FeatureComponentProps {
  feature: Feature;
  isSelected: boolean;
  onClick: () => void;
  onViewDetails: () => void;
}

function PointFeature({ feature, isSelected, onClick, onViewDetails }: FeatureComponentProps) {
  const geometry = feature.geometry as PointGeometry;
  const position: [number, number] = [geometry.coordinates[1], geometry.coordinates[0]];

  const icon = useMemo(() => {
    return L.divIcon({
      className: '',
      html: `
        <div class="landmark-marker ${isSelected ? 'selected' : ''}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
            <circle cx="12" cy="12" r="4"/>
          </svg>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
  }, [isSelected]);

  return (
    <Marker
      position={position}
      icon={icon}
      eventHandlers={{ click: onClick }}
    >
      <FeaturePopup feature={feature} onViewDetails={onViewDetails} />
    </Marker>
  );
}

function LineFeature({ feature, isSelected, onClick, onViewDetails }: FeatureComponentProps) {
  const geometry = feature.geometry as LineStringGeometry;
  const positions: [number, number][] = geometry.coordinates.map(
    (coord) => [coord[1], coord[0]]
  );

  return (
    <Polyline
      positions={positions}
      pathOptions={{
        color: isSelected ? '#0ea5e9' : '#16a34a',
        weight: isSelected ? 4 : 3,
        opacity: 0.9,
      }}
      eventHandlers={{ click: onClick }}
    >
      <FeaturePopup feature={feature} onViewDetails={onViewDetails} />
    </Polyline>
  );
}

function PolygonFeature({ feature, isSelected, onClick, onViewDetails }: FeatureComponentProps) {
  const geometry = feature.geometry as PolygonGeometry;
  const positions: [number, number][][] = geometry.coordinates.map((ring) =>
    ring.map((coord) => [coord[1], coord[0]])
  );

  return (
    <Polygon
      positions={positions}
      pathOptions={{
        color: isSelected ? '#0ea5e9' : '#16a34a',
        weight: isSelected ? 3 : 2,
        fillColor: isSelected ? '#0ea5e9' : '#16a34a',
        fillOpacity: 0.2,
      }}
      eventHandlers={{ click: onClick }}
    >
      <FeaturePopup feature={feature} onViewDetails={onViewDetails} />
    </Polygon>
  );
}

interface FeaturePopupProps {
  feature: Feature;
  onViewDetails: () => void;
}

function FeaturePopup({ feature, onViewDetails }: FeaturePopupProps) {
  return (
    <Popup>
      <div className="min-w-[150px]">
        <h3 className="font-semibold text-stone-900 mb-1">{feature.name}</h3>
        {feature.description && (
          <p className="text-sm text-stone-600 mb-2 line-clamp-2">{feature.description}</p>
        )}
        {feature.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {feature.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 bg-stone-100 text-stone-600 text-xs rounded-full"
              >
                {tag}
              </span>
            ))}
            {feature.tags.length > 3 && (
              <span className="text-xs text-stone-500">+{feature.tags.length - 3}</span>
            )}
          </div>
        )}
        <button
          onClick={onViewDetails}
          className="w-full px-3 py-1.5 bg-primary-600 text-white text-sm font-medium rounded-md hover:bg-primary-700 transition-colors"
        >
          View Details
        </button>
      </div>
    </Popup>
  );
}
