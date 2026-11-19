import { useState, useEffect } from 'react';
import { useAssetStore, useFeatureStore } from '@/store';
import { useGeolocation } from '@/hooks';
import { createPointGeometry } from '@/services/geo';
import { Button, Input, TextArea } from '@/components/common';
import type { Asset, PointGeometry } from '@/types';

interface AssetFormProps {
  asset?: Asset;
  onSuccess: (asset: Asset) => void;
  onCancel: () => void;
}

type LocationMode = 'none' | 'place' | 'pin';

export function AssetForm({ asset, onSuccess, onCancel }: AssetFormProps) {
  const { createAsset, updateAsset } = useAssetStore();
  const { features, loadFeatures } = useFeatureStore();
  const { getCurrentPosition, isLoading: gpsLoading } = useGeolocation();

  const [name, setName] = useState(asset?.name ?? '');
  const [category, setCategory] = useState(asset?.category ?? '');
  const [description, setDescription] = useState(asset?.description ?? '');
  const [tagsInput, setTagsInput] = useState((asset?.tags ?? []).join(', '));
  const [locationMode, setLocationMode] = useState<LocationMode>(
    asset?.placeId ? 'place' : asset?.location ? 'pin' : 'none'
  );
  const [placeId, setPlaceId] = useState(asset?.placeId ?? '');
  const [pin, setPin] = useState<PointGeometry | undefined>(asset?.location);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (features.length === 0) loadFeatures();
  }, [features.length, loadFeatures]);

  const capturePin = async () => {
    try {
      const pos = await getCurrentPosition();
      setPin(createPointGeometry(pos.coords.longitude, pos.coords.latitude));
    } catch {
      setError('Could not get your location');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError('Name is required');
    if (locationMode === 'place' && !placeId) return setError('Choose a place');
    if (locationMode === 'pin' && !pin) return setError('Capture a location pin first');

    setIsSubmitting(true);
    setError(null);
    const tags = tagsInput.split(',').map((t) => t.trim()).filter(Boolean);
    const common = {
      name: name.trim(),
      category: category.trim() || undefined,
      description: description.trim() || undefined,
      tags,
      placeId: locationMode === 'place' ? placeId : undefined,
      location: locationMode === 'pin' ? pin : undefined,
    };

    try {
      const saved = asset
        ? await updateAsset(asset.id, {
            ...common,
            placeId: locationMode === 'place' ? placeId : null,
            location: locationMode === 'pin' ? pin : null,
          })
        : await createAsset(common);
      onSuccess(saved);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Tractor — Kubota L3901"
        required
        autoFocus
      />

      <Input
        label="Category (optional)"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        placeholder="equipment, building, livestock…"
      />

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">Location</label>
        <div className="flex gap-1 mb-2">
          {(['none', 'place', 'pin'] as LocationMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setLocationMode(m)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                locationMode === m
                  ? 'bg-primary-100 text-primary-700 border-2 border-primary-500'
                  : 'bg-stone-100 text-stone-600 border-2 border-transparent'
              }`}
            >
              {m === 'none' ? 'None' : m === 'place' ? 'At a place' : 'Map pin'}
            </button>
          ))}
        </div>

        {locationMode === 'place' && (
          <select
            value={placeId}
            onChange={(e) => setPlaceId(e.target.value)}
            className="w-full px-3 py-2 min-h-touch bg-white border border-stone-300 rounded-lg text-stone-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Choose a place…</option>
            {features.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        )}

        {locationMode === 'pin' && (
          <div className="flex items-center gap-3">
            <Button type="button" variant="secondary" onClick={capturePin} isLoading={gpsLoading}>
              Use my location
            </Button>
            {pin && (
              <span className="text-sm text-stone-500">
                {pin.coordinates[1].toFixed(5)}, {pin.coordinates[0].toFixed(5)}
              </span>
            )}
          </div>
        )}
      </div>

      <Input
        label="Tags"
        value={tagsInput}
        onChange={(e) => setTagsInput(e.target.value)}
        placeholder="tractor, diesel"
        helperText="Separate tags with commas"
      />

      <TextArea
        label="Notes (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={2}
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting} className="flex-1">
          {asset ? 'Save asset' : 'Create asset'}
        </Button>
      </div>
    </form>
  );
}
