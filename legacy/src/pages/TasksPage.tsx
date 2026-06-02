import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDatabase } from '@/hooks';
import { getFilteredTasks, updateTask } from '@/services/database/queries';
import { formatDate } from '@/utils/datetime';
import { LoadingSpinner } from '@/components/common';
import type { Task, TaskStatus, TaskFilters } from '@/types';

const STATUS_OPTIONS: { value: TaskStatus; label: string; color: string }[] = [
  { value: 'active', label: 'Active', color: 'bg-blue-100 text-blue-700' },
  { value: 'planned', label: 'Planned', color: 'bg-stone-100 text-stone-700' },
  { value: 'done', label: 'Done', color: 'bg-green-100 text-green-700' },
  { value: 'abandoned', label: 'Abandoned', color: 'bg-red-100 text-red-700' },
];

export function TasksPage() {
  const { db, isReady } = useDatabase();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<TaskStatus[]>(['active', 'planned']);

  useEffect(() => {
    if (!isReady || !db) return;

    async function loadTasks() {
      setIsLoading(true);
      try {
        const filters: TaskFilters = {
          status: statusFilter.length > 0 ? statusFilter : undefined,
        };
        const result = await getFilteredTasks(db!, filters);
        setTasks(result);
      } catch (err) {
        console.error('Failed to load tasks:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadTasks();
  }, [isReady, db, statusFilter]);

  const handleStatusChange = async (task: Task, newStatus: TaskStatus) => {
    if (!db) return;

    try {
      await updateTask(db, task.id, { status: newStatus });
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t))
      );
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  const toggleStatusFilter = (status: TaskStatus) => {
    setStatusFilter((prev) => {
      if (prev.includes(status)) {
        return prev.filter((s) => s !== status);
      }
      return [...prev, status];
    });
  };

  return (
    <div className="h-full flex flex-col bg-stone-50">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 px-4 py-3 safe-top">
        <h1 className="text-xl font-semibold text-stone-900">Tasks</h1>
      </header>

      {/* Filter bar */}
      <div className="bg-white border-b border-stone-200 px-4 py-2">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => toggleStatusFilter(option.value)}
              className={`
                px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap
                transition-colors
                ${
                  statusFilter.includes(option.value)
                    ? option.color
                    : 'bg-stone-100 text-stone-400'
                }
              `}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : tasks.length === 0 ? (
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
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
              />
            </svg>
            <p className="text-stone-500 text-center">No tasks found</p>
            <p className="text-stone-400 text-sm text-center mt-1">
              Create tasks from feature detail pages
            </p>
          </div>
        ) : (
          <div className="divide-y divide-stone-200">
            {tasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onStatusChange={handleStatusChange}
                onNavigate={() => navigate(`/feature/${task.featureId}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface TaskItemProps {
  task: Task;
  onStatusChange: (task: Task, status: TaskStatus) => void;
  onNavigate: () => void;
}

function TaskItem({ task, onStatusChange, onNavigate }: TaskItemProps) {
  const statusOption = STATUS_OPTIONS.find((s) => s.value === task.status);
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done' && task.status !== 'abandoned';

  const getNextStatus = (): TaskStatus => {
    switch (task.status) {
      case 'planned':
        return 'active';
      case 'active':
        return 'done';
      case 'done':
        return 'planned';
      case 'abandoned':
        return 'planned';
      default:
        return 'planned';
    }
  };

  return (
    <div className="bg-white px-4 py-3 flex items-start gap-3">
      <button
        onClick={() => onStatusChange(task, getNextStatus())}
        className={`
          mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center
          transition-colors flex-shrink-0
          ${
            task.status === 'done'
              ? 'bg-green-500 border-green-500 text-white'
              : task.status === 'active'
              ? 'border-blue-500 text-blue-500'
              : task.status === 'abandoned'
              ? 'border-red-300 text-red-300 line-through'
              : 'border-stone-300'
          }
        `}
      >
        {task.status === 'done' && (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      <div className="flex-1 min-w-0" onClick={onNavigate}>
        <p
          className={`font-medium ${
            task.status === 'done' || task.status === 'abandoned'
              ? 'text-stone-400 line-through'
              : 'text-stone-900'
          }`}
        >
          {task.title}
        </p>

        {task.description && (
          <p className="text-sm text-stone-500 line-clamp-1 mt-0.5">{task.description}</p>
        )}

        <div className="flex items-center gap-2 mt-1">
          <span className={`text-xs px-2 py-0.5 rounded-full ${statusOption?.color}`}>
            {statusOption?.label}
          </span>

          {task.dueDate && (
            <span
              className={`text-xs ${isOverdue ? 'text-red-600 font-medium' : 'text-stone-500'}`}
            >
              Due {formatDate(task.dueDate)}
            </span>
          )}

          {task.priority && (
            <span className="text-xs text-stone-500">P{task.priority}</span>
          )}
        </div>
      </div>

      <svg
        className="w-5 h-5 text-stone-400 flex-shrink-0 mt-1"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </div>
  );
}
