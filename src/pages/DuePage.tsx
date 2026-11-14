import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { differenceInCalendarDays, startOfDay, addDays, format } from 'date-fns';
import { useDatabase } from '@/hooks';
import {
  getDueTasks,
  getAllFeatures,
  getAllAssets,
  completeTask,
  snoozeTask,
} from '@/services/database/queries';
import { LoadingSpinner } from '@/components/common';
import type { Task, Feature, Asset } from '@/types';

type GroupBy = 'date' | 'tag' | 'place';

interface Section {
  key: string;
  label: string;
  color: string; // rail + accent colour
  tasks: Task[];
}

function effectiveDate(task: Task): Date {
  return task.snoozedUntil ?? task.reminderDate ?? new Date();
}

function dueLabel(days: number): string {
  if (days < 0) return `${Math.abs(days)}d ago`;
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days <= 7) return format(addDays(startOfDay(new Date()), days), 'EEE');
  return format(addDays(startOfDay(new Date()), days), 'd MMM');
}

const BUCKETS = {
  overdue: { label: 'Overdue', color: '#dc2626' },
  week: { label: 'This week', color: '#d97706' },
  later: { label: 'Later', color: '#a8a29e' },
};

export function DuePage() {
  const { db, isReady } = useDatabase();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [groupBy, setGroupBy] = useState<GroupBy>('date');

  const load = useCallback(async () => {
    if (!db) return;
    setIsLoading(true);
    try {
      const [due, feats, asts] = await Promise.all([
        getDueTasks(db),
        getAllFeatures(db),
        getAllAssets(db),
      ]);
      setTasks(due);
      setFeatures(feats);
      setAssets(asts);
    } catch (err) {
      console.error('Failed to load due tasks:', err);
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  useEffect(() => {
    if (isReady && db) load();
  }, [isReady, db, load]);

  const featureNames = useMemo(
    () => new Map(features.map((f) => [f.id, f.name])),
    [features]
  );
  const assetNames = useMemo(() => new Map(assets.map((a) => [a.id, a.name])), [assets]);

  const subjectOf = useCallback(
    (task: Task): { label: string; kind: 'place' | 'asset' | 'none' } => {
      if (task.subjectType === 'asset' && task.subjectId) {
        return { label: assetNames.get(task.subjectId) ?? 'Asset', kind: 'asset' };
      }
      const placeId = task.subjectId ?? task.featureId;
      if (placeId) return { label: featureNames.get(placeId) ?? 'Place', kind: 'place' };
      if (task.location) return { label: 'On the map', kind: 'none' };
      return { label: 'No location', kind: 'none' };
    },
    [assetNames, featureNames]
  );

  const sections = useMemo<Section[]>(() => {
    if (groupBy === 'date') {
      const today = startOfDay(new Date());
      const buckets: Record<keyof typeof BUCKETS, Task[]> = { overdue: [], week: [], later: [] };
      for (const t of tasks) {
        const days = differenceInCalendarDays(startOfDay(effectiveDate(t)), today);
        if (days < 0) buckets.overdue.push(t);
        else if (days <= 7) buckets.week.push(t);
        else buckets.later.push(t);
      }
      return (Object.keys(BUCKETS) as (keyof typeof BUCKETS)[])
        .map((k) => ({ key: k, label: BUCKETS[k].label, color: BUCKETS[k].color, tasks: buckets[k] }))
        .filter((s) => s.tasks.length > 0);
    }

    if (groupBy === 'tag') {
      const byTag = new Map<string, Task[]>();
      for (const t of tasks) {
        const tags = t.tags.length > 0 ? t.tags : ['— untagged —'];
        for (const tag of tags) {
          if (!byTag.has(tag)) byTag.set(tag, []);
          byTag.get(tag)!.push(t);
        }
      }
      return Array.from(byTag.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([tag, ts]) => ({ key: tag, label: tag, color: '#78716c', tasks: ts }));
    }

    // by place / subject
    const bySubject = new Map<string, Task[]>();
    for (const t of tasks) {
      const { label } = subjectOf(t);
      if (!bySubject.has(label)) bySubject.set(label, []);
      bySubject.get(label)!.push(t);
    }
    return Array.from(bySubject.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([label, ts]) => ({ key: label, label, color: '#78716c', tasks: ts }));
  }, [tasks, groupBy, subjectOf]);

  const handleComplete = async (task: Task) => {
    if (!db) return;
    try {
      await completeTask(db, task.id);
      await load();
    } catch (err) {
      console.error('Failed to complete task:', err);
    }
  };

  const handleSnooze = async (task: Task) => {
    if (!db) return;
    try {
      await snoozeTask(db, task.id, addDays(new Date(), 7));
      await load();
    } catch (err) {
      console.error('Failed to snooze task:', err);
    }
  };

  const handleOpen = (task: Task) => {
    const { kind } = subjectOf(task);
    const placeId = task.subjectId ?? task.featureId;
    if (kind === 'place' && placeId) navigate(`/feature/${placeId}`);
  };

  return (
    <div className="h-full flex flex-col bg-stone-50">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 px-4 pt-3 pb-2 safe-top">
        <div className="flex items-baseline justify-between">
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Due</h1>
          <span className="text-sm font-medium text-stone-500">
            {tasks.length} open
          </span>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <span className="text-xs font-bold text-stone-400 uppercase tracking-wide">Group</span>
          <div className="flex bg-stone-100 rounded-lg p-0.5">
            {(['date', 'tag', 'place'] as GroupBy[]).map((g) => (
              <button
                key={g}
                onClick={() => setGroupBy(g)}
                className={`px-3.5 py-1.5 rounded-md text-sm font-semibold capitalize transition-colors ${
                  groupBy === g
                    ? 'bg-white text-primary-700 shadow-sm'
                    : 'text-stone-500'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <svg className="w-16 h-16 text-stone-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9" strokeWidth={2} />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 2" />
            </svg>
            <p className="text-stone-500 text-center font-medium">Nothing due</p>
            <p className="text-stone-400 text-sm text-center mt-1">
              Add a reminder to a task and it will show up here
            </p>
          </div>
        ) : (
          sections.map((section) => (
            <div key={section.key}>
              <div
                className="px-4 pt-4 pb-1.5 text-xs font-extrabold uppercase tracking-wide"
                style={{ color: section.color }}
              >
                {section.label}
              </div>
              {section.tasks.map((task) => (
                <DueRow
                  key={`${section.key}:${task.id}`}
                  task={task}
                  railColor={groupBy === 'date' ? section.color : '#d6d3d1'}
                  subject={subjectOf(task)}
                  onOpen={() => handleOpen(task)}
                  onSnooze={() => handleSnooze(task)}
                  onComplete={() => handleComplete(task)}
                />
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

interface DueRowProps {
  task: Task;
  railColor: string;
  subject: { label: string; kind: 'place' | 'asset' | 'none' };
  onOpen: () => void;
  onSnooze: () => void;
  onComplete: () => void;
}

function DueRow({ task, railColor, subject, onOpen, onSnooze, onComplete }: DueRowProps) {
  const days = differenceInCalendarDays(startOfDay(effectiveDate(task)), startOfDay(new Date()));
  const dateColor = days < 0 ? '#dc2626' : days <= 7 ? '#d97706' : '#78716c';
  const recurs = task.recurrenceInterval && task.recurrenceUnit;

  return (
    <div className="flex gap-3 px-4 py-3.5 bg-white border-b border-stone-100">
      <div className="w-1 rounded-full flex-none" style={{ background: railColor }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <button onClick={onOpen} className="text-left font-semibold text-stone-900 leading-snug">
            {task.title}
          </button>
          {recurs && (
            <span className="flex items-center gap-1 text-stone-500 flex-none mt-0.5">
              <RepeatIcon />
              <span className="text-[11px] font-bold">
                {task.recurrenceInterval === 1
                  ? `1 ${task.recurrenceUnit!.replace(/s$/, '')}`
                  : `${task.recurrenceInterval} ${task.recurrenceUnit}`}
              </span>
            </span>
          )}
        </div>

        <button onClick={onOpen} className="flex items-center gap-1.5 mt-1 text-stone-500 text-[12.5px]">
          <SubjectIcon kind={subject.kind} />
          <span className="truncate">{subject.label}</span>
        </button>

        <div className="flex items-center gap-2 mt-2.5">
          {task.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center bg-stone-100 text-stone-600 rounded-full px-2 py-0.5 text-[11px] font-semibold"
            >
              {tag}
            </span>
          ))}
          <div className="flex-1" />
          <span className="text-xs font-bold" style={{ color: dateColor }}>
            {dueLabel(days)}
          </span>
        </div>

        <div className="flex gap-2 mt-3">
          <button
            onClick={onSnooze}
            className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg bg-stone-100 text-stone-600 text-[13px] font-bold"
          >
            <ClockIcon /> Snooze
          </button>
          <button
            onClick={onComplete}
            className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg bg-primary-600 text-white text-[13px] font-bold"
          >
            <CheckIcon /> Done
          </button>
        </div>
      </div>
    </div>
  );
}

function SubjectIcon({ kind }: { kind: 'place' | 'asset' | 'none' }) {
  if (kind === 'asset') {
    return (
      <svg className="w-3.5 h-3.5 flex-none" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    );
  }
  return (
    <svg className="w-3.5 h-3.5 flex-none" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.7 16.7L13.4 21a2 2 0 01-2.8 0l-4.3-4.3a8 8 0 1111.4 0z" />
      <circle cx="12" cy="11" r="2.5" />
    </svg>
  );
}

function RepeatIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.6M20 20v-5h-.6M19.4 9A8 8 0 004.6 7M4.6 15A8 8 0 0019.4 17" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="8.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5V12l3 2" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.4} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12l5 5L20 7" />
    </svg>
  );
}
