import { useMemo } from 'react';
import { formatRelative } from '@/utils/datetime';
import type { Observation, Measurement, Task, Media } from '@/types';

interface TimelineEntry {
  id: string;
  type: 'observation' | 'measurement' | 'task';
  date: Date;
  data: Observation | Measurement | Task;
}

interface FeatureTimelineProps {
  observations: Observation[];
  measurements: Measurement[];
  tasks: Task[];
  media: Media[];
  onRefresh?: () => void;
}

export function FeatureTimeline({
  observations,
  measurements,
  tasks,
  media,
}: FeatureTimelineProps) {
  const entries = useMemo(() => {
    const allEntries: TimelineEntry[] = [
      ...observations.map((o) => ({
        id: o.id,
        type: 'observation' as const,
        date: o.recordedAt,
        data: o,
      })),
      ...measurements.map((m) => ({
        id: m.id,
        type: 'measurement' as const,
        date: m.recordedAt,
        data: m,
      })),
      ...tasks.map((t) => ({
        id: t.id,
        type: 'task' as const,
        date: t.createdAt,
        data: t,
      })),
    ];

    // Sort by date, newest first
    return allEntries.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [observations, measurements, tasks]);

  const mediaByObservation = useMemo(() => {
    const map = new Map<string, Media[]>();
    for (const m of media) {
      if (m.observationId) {
        const existing = map.get(m.observationId) || [];
        existing.push(m);
        map.set(m.observationId, existing);
      }
    }
    return map;
  }, [media]);

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <svg
          className="w-16 h-16 text-stone-300 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p className="text-stone-500 text-center">No entries yet</p>
        <p className="text-stone-400 text-sm text-center mt-1">
          Add observations, measurements, or tasks to build a timeline
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-stone-200">
      {entries.map((entry) => (
        <TimelineItem
          key={`${entry.type}-${entry.id}`}
          entry={entry}
          media={entry.type === 'observation' ? mediaByObservation.get(entry.id) : undefined}
        />
      ))}
    </div>
  );
}

interface TimelineItemProps {
  entry: TimelineEntry;
  media?: Media[];
}

function TimelineItem({ entry, media }: TimelineItemProps) {
  switch (entry.type) {
    case 'observation':
      return <ObservationItem observation={entry.data as Observation} media={media} />;
    case 'measurement':
      return <MeasurementItem measurement={entry.data as Measurement} />;
    case 'task':
      return <TaskItem task={entry.data as Task} />;
    default:
      return null;
  }
}

function ObservationItem({ observation, media }: { observation: Observation; media?: Media[] }) {
  return (
    <div className="bg-white px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-blue-600 uppercase">Observation</span>
            <span className="text-xs text-stone-500">{formatRelative(observation.recordedAt)}</span>
          </div>
          {observation.notes && (
            <p className="text-stone-900 mt-1">{observation.notes}</p>
          )}
          {observation.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {observation.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 bg-stone-100 text-stone-600 text-xs rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          {media && media.length > 0 && (
            <div className="flex gap-2 mt-2 overflow-x-auto">
              {media.map((m) => (
                <div key={m.id} className="w-16 h-16 bg-stone-200 rounded flex-shrink-0" />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MeasurementItem({ measurement }: { measurement: Measurement }) {
  return (
    <div className="bg-white px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-purple-600 uppercase">Measurement</span>
            <span className="text-xs text-stone-500">{formatRelative(measurement.recordedAt)}</span>
          </div>
          <div className="mt-1">
            <span className="text-stone-600">{measurement.metric}: </span>
            <span className="font-semibold text-stone-900">
              {measurement.value} {measurement.unit}
            </span>
            <span className="text-xs text-stone-500 ml-2">({measurement.method})</span>
          </div>
          {measurement.notes && (
            <p className="text-sm text-stone-500 mt-1">{measurement.notes}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function TaskItem({ task }: { task: Task }) {
  const statusColors = {
    planned: 'bg-stone-100 text-stone-600',
    active: 'bg-blue-100 text-blue-600',
    done: 'bg-green-100 text-green-600',
    abandoned: 'bg-red-100 text-red-600',
  };

  return (
    <div className="bg-white px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-600 uppercase">Task</span>
            <span className="text-xs text-stone-500">{formatRelative(task.createdAt)}</span>
          </div>
          <p className={`font-medium mt-1 ${task.status === 'done' ? 'text-stone-400 line-through' : 'text-stone-900'}`}>
            {task.title}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[task.status]}`}>
              {task.status}
            </span>
            {task.priority && (
              <span className="text-xs text-stone-500">Priority {task.priority}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
