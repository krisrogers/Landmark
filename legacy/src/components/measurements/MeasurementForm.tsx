import { useState } from 'react';
import { useDatabase } from '@/hooks';
import { createMeasurement } from '@/services/database/queries';
import { Button, Input, TextArea } from '@/components/common';
import { COMMON_UNITS, type MeasurementMethod } from '@/types';

interface MeasurementFormProps {
  featureId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const COMMON_METRICS = [
  'height',
  'width',
  'diameter',
  'depth',
  'length',
  'area',
  'volume',
  'flow_rate',
  'temperature',
  'count',
];

export function MeasurementForm({ featureId, onSuccess, onCancel }: MeasurementFormProps) {
  const { db } = useDatabase();

  const [metric, setMetric] = useState('');
  const [value, setValue] = useState('');
  const [unit, setUnit] = useState('m');
  const [method, setMethod] = useState<MeasurementMethod>('estimated');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!db) {
      setError('Database not available');
      return;
    }

    if (!metric.trim()) {
      setError('Metric is required');
      return;
    }

    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      setError('Value must be a number');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await createMeasurement(db, {
        featureId,
        metric: metric.trim(),
        value: numValue,
        unit,
        method,
        notes: notes.trim() || undefined,
      });

      onSuccess();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const allUnits = [
    ...COMMON_UNITS.length,
    ...COMMON_UNITS.area,
    ...COMMON_UNITS.volume,
    ...COMMON_UNITS.mass,
    ...COMMON_UNITS.rate,
    ...COMMON_UNITS.temperature,
    ...COMMON_UNITS.percentage,
    ...COMMON_UNITS.count,
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">Metric</label>
        <input
          type="text"
          value={metric}
          onChange={(e) => setMetric(e.target.value)}
          placeholder="What are you measuring?"
          list="metrics"
          className="w-full px-3 py-2 min-h-touch bg-white border border-stone-300 rounded-lg text-stone-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
          autoFocus
        />
        <datalist id="metrics">
          {COMMON_METRICS.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <Input
            label="Value"
            type="number"
            step="any"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="0"
            required
          />
        </div>
        <div className="w-24">
          <label className="block text-sm font-medium text-stone-700 mb-1">Unit</label>
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="w-full px-3 py-2 min-h-touch bg-white border border-stone-300 rounded-lg text-stone-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {allUnits.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">Method</label>
        <div className="flex gap-2">
          {(['estimated', 'measured', 'derived'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMethod(m)}
              className={`
                flex-1 py-2 px-3 rounded-lg text-sm font-medium capitalize transition-colors
                ${
                  method === m
                    ? 'bg-primary-100 text-primary-700 border-2 border-primary-500'
                    : 'bg-stone-100 text-stone-600 border-2 border-transparent'
                }
              `}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <TextArea
        label="Notes (optional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Any additional details..."
        rows={2}
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting} className="flex-1">
          Save Measurement
        </Button>
      </div>
    </form>
  );
}
