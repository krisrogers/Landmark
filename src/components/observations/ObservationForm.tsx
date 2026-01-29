import { useState } from 'react';
import { useDatabase, useGeolocation } from '@/hooks';
import { createObservation } from '@/services/database/queries';
import { Button, TextArea, Input } from '@/components/common';

interface ObservationFormProps {
  featureId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ObservationForm({ featureId, onSuccess, onCancel }: ObservationFormProps) {
  const { db } = useDatabase();
  const { latitude, longitude, accuracy } = useGeolocation();

  const [notes, setNotes] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!db) {
      setError('Database not available');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      await createObservation(db, {
        featureId,
        notes: notes.trim() || undefined,
        tags,
        observerLatitude: latitude,
        observerLongitude: longitude,
        observerAccuracy: accuracy,
      });

      onSuccess();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <TextArea
        label="Notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="What did you observe?"
        rows={4}
        autoFocus
      />

      <Input
        label="Tags"
        value={tagsInput}
        onChange={(e) => setTagsInput(e.target.value)}
        placeholder="condition, weather, growth"
        helperText="Separate tags with commas"
      />

      {latitude && longitude && (
        <p className="text-xs text-stone-500">
          Recording location: {latitude.toFixed(5)}, {longitude.toFixed(5)}
          {accuracy && ` (±${accuracy.toFixed(0)}m)`}
        </p>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting} className="flex-1">
          Save Observation
        </Button>
      </div>
    </form>
  );
}
