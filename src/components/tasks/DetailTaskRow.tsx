import { format } from 'date-fns';
import type { Task } from '@/types';

interface DetailTaskRowProps {
  task: Task;
  onComplete: () => void;
  onClick?: () => void;
}

export function DetailTaskRow({ task, onComplete, onClick }: DetailTaskRowProps) {
  const reminder = task.snoozedUntil ?? task.reminderDate;
  const recurs = task.recurrenceInterval && task.recurrenceUnit;

  return (
    <div className="flex items-start gap-3 px-4 py-3 bg-white border-b border-stone-100">
      <button
        onClick={onComplete}
        aria-label="Mark done"
        className="mt-0.5 w-6 h-6 rounded-full border-2 border-stone-300 flex items-center justify-center flex-none hover:border-primary-500 transition-colors"
      />
      <div className="flex-1 min-w-0" onClick={onClick}>
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold text-stone-900 leading-snug">{task.title}</p>
          {recurs && (
            <span className="flex items-center gap-1 text-stone-500 flex-none mt-0.5">
              <RepeatIcon />
              <span className="text-[11px] font-bold">
                {task.recurrenceInterval} {task.recurrenceUnit}
              </span>
            </span>
          )}
        </div>
        {task.description && (
          <p className="text-sm text-stone-500 mt-0.5 line-clamp-2">{task.description}</p>
        )}
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          {reminder && (
            <span className="inline-flex items-center gap-1 text-amber-600 text-xs font-bold">
              <ClockIcon />
              {format(reminder, 'd MMM yyyy')}
            </span>
          )}
          {task.tags.map((tag) => (
            <span key={tag} className="bg-stone-100 text-stone-600 rounded-full px-2 py-0.5 text-[11px] font-semibold">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
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
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="8.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5V12l3 2" />
    </svg>
  );
}
