import { useMemo } from 'react';
import { Marker, Popup } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import type { Asset, Feature } from '@/types';
import { getGeometryCenter } from '@/services/geo';

export type DueSeverity = 'due' | 'overdue';

interface AssetLayerProps {
  assets: Asset[];
  features: Feature[];
  dueBySubject: Map<string, DueSeverity>;
}

function assetPosition(asset: Asset, features: Feature[]): [number, number] | null {
  if (asset.location) {
    return [asset.location.coordinates[1], asset.location.coordinates[0]];
  }
  if (asset.placeId) {
    const place = features.find((f) => f.id === asset.placeId);
    if (place) return getGeometryCenter(place.geometry);
  }
  return null;
}

function assetIcon(severity?: DueSeverity): L.DivIcon {
  const dot =
    severity === 'overdue'
      ? '<span class="landmark-due-dot" style="background:#dc2626"></span>'
      : severity === 'due'
      ? '<span class="landmark-due-dot" style="background:#d97706"></span>'
      : '';
  return L.divIcon({
    className: '',
    html: `
      <div class="landmark-asset-marker">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
        </svg>
        ${dot}
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

export function AssetLayer({ assets, features, dueBySubject }: AssetLayerProps) {
  const navigate = useNavigate();

  const located = useMemo(
    () =>
      assets
        .map((asset) => ({ asset, position: assetPosition(asset, features) }))
        .filter((a): a is { asset: Asset; position: [number, number] } => a.position !== null),
    [assets, features]
  );

  return (
    <>
      {located.map(({ asset, position }) => (
        <Marker key={asset.id} position={position} icon={assetIcon(dueBySubject.get(asset.id))}>
          <Popup>
            <div className="min-w-[150px]">
              <h3 className="font-semibold text-stone-900 mb-1">{asset.name}</h3>
              <p className="text-xs text-stone-500 mb-2">
                Asset{asset.category ? ` · ${asset.category}` : ''}
              </p>
              <button
                onClick={() => navigate(`/asset/${asset.id}`)}
                className="w-full px-3 py-1.5 bg-primary-600 text-white text-sm font-medium rounded-md hover:bg-primary-700"
              >
                View Details
              </button>
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
}
