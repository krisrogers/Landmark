import { useState } from 'react';
import { useDatabase } from '@/hooks';
import { createTask } from '@/services/database/queries';
import { Button, Input, TextArea } from '@/components/common';
import type { TaskStatus } from '@/types';

interface TaskFormProps {
  featureId: string;
  onSuccess: () => void;
  onCancel: () => void;
  initialTitle?: string;
}

export function TaskForm({ featureId, onSuccess, onCancel, initialTitle = '' }: TaskFormProps) {
  const { db } = useDatabase();

  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<number | undefined>(undefined);
  const [dueDate, setDueDate] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!db) {
      setError('Database not available');
      return;
    }

    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      await createTask(db, {
        featureId,
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        tags,
        status: 'planned',
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
      <Input
        label="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="What needs to be done?"
        required
        autoFocus
      />

      <TextArea
        label="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Add more details..."
        rows={2}
      />

      <div className="flex gap-3">
        <div className="flex-1">
          <label className="block text-sm font-medium text-stone-700 mb-1">Priority</label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPriority(priority === p ? undefined : p)}
                className={`
                  flex-1 py-2 rounded-lg text-sm font-medium transition-colors
                  ${
                    priority === p
                      ? 'bg-primary-100 text-primary-700 border-2 border-primary-500'
                      : 'bg-stone-100 text-stone-600 border-2 border-transparent'
                  }
                `}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Input
        label="Due Date (optional)"
        type="date"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
      />

      <Input
        label="Tags"
        value={tagsInput}
        onChange={(e) => setTagsInput(e.target.value)}
        placeholder="maintenance, seasonal, urgent"
        helperText="Separate tags with commas"
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting} className="flex-1">
          Create Task
        </Button>
      </div>
    </form>
  );
}
