import { useState, useEffect, useMemo } from 'react';
import { useDatabase } from '@/hooks';
import { createTask, updateTask } from '@/services/database/queries';
import { useFeatureStore, useAssetStore } from '@/store';
import { Button, Input, TextArea } from '@/components/common';
import { formatDate } from '@/utils/datetime';
import type { Task, TaskSubjectType, RecurrenceUnit } from '@/types';

export interface TaskSubjectRef {
  type: TaskSubjectType;
  id: string;
  label?: string;
}

interface TaskFormProps {
  /** Pre-set subject (locks the picker) — e.g. from a place or asset detail page. */
  subject?: TaskSubjectRef;
  /** Legacy convenience: a place subject by feature id. */
  featureId?: string;
  /** When provided, the form edits this task instead of creating one. */
  task?: Task;
  onSuccess: () => void;
  onCancel: () => void;
  initialTitle?: string;
}

const UNITS: { value: RecurrenceUnit; label: string }[] = [
  { value: 'days', label: 'days' },
  { value: 'weeks', label: 'weeks' },
  { value: 'months', label: 'months' },
  { value: 'years', label: 'years' },
];

export function TaskForm({
  subject,
  featureId,
  task,
  onSuccess,
  onCancel,
  initialTitle = '',
}: TaskFormProps) {
  const { db } = useDatabase();
  const { features, loadFeatures } = useFeatureStore();
  const { assets, loadAssets } = useAssetStore();

  const presetSubject: TaskSubjectRef | undefined =
    subject ?? (featureId ? { type: 'place', id: featureId } : undefined);

  const [title, setTitle] = useState(task?.title ?? initialTitle);
  const [description, setDescription] = useState(task?.description ?? '');
  const [subjectType, setSubjectType] = useState<TaskSubjectType | 'none'>(
    task?.subjectType ?? presetSubject?.type ?? 'none'
  );
  const [subjectId, setSubjectId] = useState<string>(
    task?.subjectId ?? presetSubject?.id ?? ''
  );
  const [reminderDate, setReminderDate] = useState(
    task?.reminderDate ? formatDate(task.reminderDate) : ''
  );
  const [repeats, setRepeats] = useState(!!task?.recurrenceInterval);
  const [interval, setInterval] = useState<number>(task?.recurrenceInterval ?? 1);
  const [unit, setUnit] = useState<RecurrenceUnit>(task?.recurrenceUnit ?? 'months');
  const [tagsInput, setTagsInput] = useState((task?.tags ?? []).join(', '));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subjectLocked = !!presetSubject && !task;

  useEffect(() => {
    if (!subjectLocked && features.length === 0) loadFeatures();
    if (!subjectLocked && assets.length === 0) loadAssets();
  }, [subjectLocked, features.length, assets.length, loadFeatures, loadAssets]);

  const subjectOptions = useMemo(() => {
    if (subjectType === 'place') return features.map((f) => ({ id: f.id, name: f.name }));
    if (subjectType === 'asset') return assets.map((a) => ({ id: a.id, name: a.name }));
    return [];
  }, [subjectType, features, assets]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db) return setError('Database not available');
    if (!title.trim()) return setError('Title is required');
    if (subjectType !== 'none' && !subjectId) return setError('Choose what this task is on');

    setIsSubmitting(true);
    setError(null);

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const reminder = reminderDate ? new Date(reminderDate) : undefined;
    const recurrence = repeats && reminder
      ? { recurrenceInterval: interval, recurrenceUnit: unit }
      : { recurrenceInterval: undefined, recurrenceUnit: undefined };

    try {
      if (task) {
        await updateTask(db, task.id, {
          title: title.trim(),
          description: description.trim() || undefined,
          subjectType: subjectType === 'none' ? undefined : subjectType,
          subjectId: subjectType === 'none' ? undefined : subjectId,
          reminderDate: reminder ?? null,
          recurrenceInterval: recurrence.recurrenceInterval ?? null,
          recurrenceUnit: recurrence.recurrenceUnit ?? null,
          tags,
        });
      } else {
        await createTask(db, {
          subjectType: subjectType === 'none' ? undefined : subjectType,
          subjectId: subjectType === 'none' ? undefined : subjectId,
          title: title.trim(),
          description: description.trim() || undefined,
          reminderDate: reminder,
          ...recurrence,
          tags,
          status: 'planned',
        });
      }
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

      {/* Subject picker (hidden when locked to a preset subject) */}
      {!subjectLocked && (
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">On</label>
          <div className="flex gap-1 mb-2">
            {(['none', 'place', 'asset'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setSubjectType(t);
                  setSubjectId('');
                }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                  subjectType === t
                    ? 'bg-primary-100 text-primary-700 border-2 border-primary-500'
                    : 'bg-stone-100 text-stone-600 border-2 border-transparent'
                }`}
              >
                {t === 'none' ? 'Nothing' : t}
              </button>
            ))}
          </div>
          {subjectType !== 'none' && (
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="w-full px-3 py-2 min-h-touch bg-white border border-stone-300 rounded-lg text-stone-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Choose a {subjectType}…</option>
              {subjectOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      <Input
        label="Remind me"
        type="date"
        value={reminderDate}
        onChange={(e) => setReminderDate(e.target.value)}
        helperText="Optional — the task shows up in Due on this date"
      />

      {/* Repeat */}
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-stone-700 mb-2">
          <input
            type="checkbox"
            checked={repeats}
            onChange={(e) => setRepeats(e.target.checked)}
            disabled={!reminderDate}
            className="w-4 h-4 rounded accent-primary-600"
          />
          Repeat{!reminderDate && <span className="text-stone-400 font-normal">(needs a reminder date)</span>}
        </label>
        {repeats && reminderDate && (
          <div className="flex items-center gap-2 pl-6">
            <span className="text-sm text-stone-600">every</span>
            <input
              type="number"
              min={1}
              value={interval}
              onChange={(e) => setInterval(Math.max(1, Number(e.target.value)))}
              className="w-16 px-2 py-2 bg-white border border-stone-300 rounded-lg text-stone-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value as RecurrenceUnit)}
              className="flex-1 px-3 py-2 bg-white border border-stone-300 rounded-lg text-stone-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {UNITS.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <TextArea
        label="Notes (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Add a plan or details…"
        rows={2}
      />

      <Input
        label="Tags"
        value={tagsInput}
        onChange={(e) => setTagsInput(e.target.value)}
        placeholder="service, winter-prep"
        helperText="Separate tags with commas — this is how tasks group into projects"
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting} className="flex-1">
          {task ? 'Save task' : 'Create task'}
        </Button>
      </div>
    </form>
  );
}
