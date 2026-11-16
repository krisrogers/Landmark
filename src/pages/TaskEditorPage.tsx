import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { TaskForm } from '@/components/tasks/TaskForm';
import { LoadingSpinner } from '@/components/common';
import { useDatabase } from '@/hooks';
import { getTaskById } from '@/services/database/queries';
import type { Task } from '@/types';

/** New task (/task/new) or edit an existing one (/task/:id) — e.g. to attach it to a place later. */
export function TaskEditorPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { db, isReady } = useDatabase();
  const isEdit = !!id && id !== 'new';
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(isEdit);

  useEffect(() => {
    if (!isEdit || !isReady || !db) return;
    let active = true;
    getTaskById(db, id!)
      .then((t) => {
        if (active) setTask(t);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isEdit, isReady, db, id]);

  return (
    <div className="h-full flex flex-col bg-stone-50">
      <header className="bg-white border-b border-stone-200 px-4 py-3 safe-top flex items-center gap-2">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-stone-100 rounded-lg">
          <svg className="w-6 h-6 text-stone-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-semibold text-stone-900">{isEdit ? 'Edit task' : 'New task'}</h1>
      </header>
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : isEdit && !task ? (
          <p className="text-center text-stone-500 py-12">This task no longer exists.</p>
        ) : (
          <TaskForm
            task={task ?? undefined}
            onSuccess={() => navigate('/due')}
            onCancel={() => navigate(-1)}
          />
        )}
      </div>
    </div>
  );
}
