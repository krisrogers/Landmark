import { useState } from 'react';
import { useFeatureStore } from '@/store';
import { Button, Input, TextArea } from '@/components/common';
import type { Feature, UpdateFeatureInput } from '@/types';

interface FeatureFormProps {
  feature: Feature;
  onSuccess: () => void;
  onCancel: () => void;
}

export function FeatureForm({ feature, onSuccess, onCancel }: FeatureFormProps) {
  const { updateFeature } = useFeatureStore();
  const [name, setName] = useState(feature.name);
  const [description, setDescription] = useState(feature.description || '');
  const [tagsInput, setTagsInput] = useState(feature.tags.join(', '));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      const input: UpdateFeatureInput = {
        name: name.trim(),
        description: description.trim() || undefined,
        tags,
      };

      await updateFeature(feature.id, input);
      onSuccess();
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
        placeholder="Feature name"
        required
        autoFocus
      />

      <TextArea
        label="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Optional description..."
        rows={3}
      />

      <Input
        label="Tags"
        value={tagsInput}
        onChange={(e) => setTagsInput(e.target.value)}
        placeholder="tag1, tag2, tag3"
        helperText="Separate tags with commas"
      />

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting} className="flex-1">
          Save Changes
        </Button>
      </div>
    </form>
  );
}
