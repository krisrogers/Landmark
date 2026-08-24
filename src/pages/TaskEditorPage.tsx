import { useNavigate } from 'react-router-dom';
import { TaskForm } from '@/components/tasks/TaskForm';

export function TaskEditorPage() {
  const navigate = useNavigate();

  return (
    <div className="h-full flex flex-col bg-stone-50">
      <header className="bg-white border-b border-stone-200 px-4 py-3 safe-top flex items-center gap-2">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-stone-100 rounded-lg">
          <svg className="w-6 h-6 text-stone-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-semibold text-stone-900">New task</h1>
      </header>
      <div className="flex-1 overflow-y-auto p-4">
        <TaskForm onSuccess={() => navigate('/due')} onCancel={() => navigate(-1)} />
      </div>
    </div>
  );
}
