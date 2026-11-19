import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useDatabase } from '@/hooks';
import { useAssetStore } from '@/store';
import {
  getAssetById,
  getFeatureById,
  getTasksBySubject,
  completeTask,
} from '@/services/database/queries';
import { Button, Modal, ConfirmModal, LoadingSpinner } from '@/components/common';
import { AssetForm } from '@/components/assets';
import { TaskForm } from '@/components/tasks/TaskForm';
import { DetailTaskRow } from '@/components/tasks/DetailTaskRow';
import type { Asset, Task } from '@/types';

export function AssetPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { db, isReady } = useDatabase();
  const { deleteAsset } = useAssetStore();

  const [asset, setAsset] = useState<Asset | null>(null);
  const [placeName, setPlaceName] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [showTask, setShowTask] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const load = useCallback(async () => {
    if (!db || !id) return;
    setIsLoading(true);
    try {
      const [a, t] = await Promise.all([getAssetById(db, id), getTasksBySubject(db, 'asset', id)]);
      setAsset(a);
      setTasks(t);
      if (a?.placeId) {
        const place = await getFeatureById(db, a.placeId);
        setPlaceName(place?.name ?? null);
      } else {
        setPlaceName(null);
      }
    } catch (err) {
      console.error('Failed to load asset:', err);
    } finally {
      setIsLoading(false);
    }
  }, [db, id]);

  useEffect(() => {
    if (isReady && db) load();
  }, [isReady, db, load]);

  const handleComplete = async (task: Task) => {
    if (!db) return;
    await completeTask(db, task.id);
    load();
  };

  const handleDelete = async () => {
    if (!id) return;
    await deleteAsset(id);
    navigate('/things');
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-4">
        <h2 className="text-xl font-semibold text-stone-900 mb-2">Asset not found</h2>
        <Button onClick={() => navigate('/things')}>Back to Things</Button>
      </div>
    );
  }

  const openTasks = tasks.filter((t) => t.status !== 'done' && t.status !== 'abandoned');
  const doneTasks = tasks
    .filter((t) => t.status === 'done')
    .sort((a, b) => (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0));

  const locationLabel = asset.placeId
    ? `at ${placeName ?? 'a place'}`
    : asset.location
    ? `${asset.location.coordinates[1].toFixed(4)}, ${asset.location.coordinates[0].toFixed(4)}`
    : 'No location';

  return (
    <div className="h-full flex flex-col bg-stone-50">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 px-4 py-3 safe-top">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-stone-100 rounded-lg">
            <BackIcon />
          </button>
          <div className="flex-1" />
          <button onClick={() => setShowEdit(true)} className="p-2 hover:bg-stone-100 rounded-lg">
            <EditIcon />
          </button>
        </div>
        <div className="mt-1">
          <span className="inline-flex items-center gap-1.5 bg-sky-100 text-sky-800 rounded-full px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wide">
            Asset{asset.category ? ` · ${asset.category}` : ''}
          </span>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight mt-2">{asset.name}</h1>
          <button
            onClick={() => setShowEdit(true)}
            className="flex items-center gap-1.5 mt-1.5 text-sky-700 text-sm font-semibold"
          >
            <PinIcon />
            {locationLabel}
          </button>
          {asset.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {asset.tags.map((tag) => (
                <span key={tag} className="bg-stone-100 text-stone-600 rounded-full px-2.5 py-0.5 text-xs font-semibold">
                  {tag}
                </span>
              ))}
            </div>
          )}
          {asset.description && (
            <p className="text-sm text-stone-600 mt-3">{asset.description}</p>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {/* Open tasks */}
        <SectionHeader label={`Open tasks · ${openTasks.length}`} action="Add" onAction={() => setShowTask(true)} />
        {openTasks.length === 0 ? (
          <p className="px-4 py-3 text-sm text-stone-400">No open tasks.</p>
        ) : (
          openTasks.map((t) => <DetailTaskRow key={t.id} task={t} onComplete={() => handleComplete(t)} />)
        )}

        {/* History */}
        <SectionHeader label="History" />
        <div className="px-4 pt-1 pb-6">
          {doneTasks.map((t) => (
            <HistoryItem
              key={t.id}
              title={t.title}
              date={t.completedAt ? format(t.completedAt, 'd MMM yyyy') : ''}
            />
          ))}
          <HistoryItem title="Added to Landmark" date={format(asset.createdAt, 'd MMM yyyy')} muted last />
        </div>
      </div>

      {/* Action bar */}
      <div className="bg-white border-t border-stone-200 px-4 py-3 safe-bottom flex gap-2">
        <button
          onClick={() => setShowTask(true)}
          className="flex-1 flex items-center justify-center gap-2 h-12 rounded-xl bg-primary-600 text-white font-bold"
        >
          <PlusIcon /> Add task
        </button>
      </div>

      {/* Modals */}
      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="Edit asset">
        <AssetForm
          asset={asset}
          onSuccess={() => {
            setShowEdit(false);
            load();
          }}
          onCancel={() => setShowEdit(false)}
        />
      </Modal>

      <Modal isOpen={showTask} onClose={() => setShowTask(false)} title="Add task">
        <TaskForm
          subject={{ type: 'asset', id: asset.id, label: asset.name }}
          onSuccess={() => {
            setShowTask(false);
            load();
          }}
          onCancel={() => setShowTask(false)}
        />
      </Modal>

      <ConfirmModal
        isOpen={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title="Delete asset"
        message={`Delete "${asset.name}"? Its tasks will remain but lose their link.`}
        confirmText="Delete"
        variant="danger"
      />

      <div className="bg-white border-t border-stone-100 px-4 py-2 safe-bottom">
        <button
          onClick={() => setShowDelete(true)}
          className="w-full text-red-600 text-sm font-medium py-2 hover:bg-red-50 rounded-lg"
        >
          Delete asset
        </button>
      </div>
    </div>
  );
}

function SectionHeader({ label, action, onAction }: { label: string; action?: string; onAction?: () => void }) {
  return (
    <div className="px-4 pt-4 pb-1.5 flex items-center justify-between">
      <h3 className="text-xs font-extrabold text-stone-400 uppercase tracking-wide">{label}</h3>
      {action && (
        <button onClick={onAction} className="flex items-center gap-1 text-primary-700 text-sm font-bold">
          <PlusIcon small /> {action}
        </button>
      )}
    </div>
  );
}

function HistoryItem({ title, date, muted, last }: { title: string; date: string; muted?: boolean; last?: boolean }) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center flex-none">
        <div className={`w-2.5 h-2.5 rounded-full ${muted ? 'bg-stone-300' : 'bg-primary-600'}`} />
        {!last && <div className="w-0.5 flex-1 bg-stone-200" />}
      </div>
      <div className="pb-4">
        <div className="text-sm font-semibold text-stone-800">{title}</div>
        {date && <div className="text-xs text-stone-400 mt-0.5">{date}</div>}
      </div>
    </div>
  );
}

function BackIcon() {
  return (
    <svg className="w-6 h-6 text-stone-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}
function EditIcon() {
  return (
    <svg className="w-6 h-6 text-stone-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );
}
function PinIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.7 16.7L13.4 21a2 2 0 01-2.8 0l-4.3-4.3a8 8 0 1111.4 0z" />
      <circle cx="12" cy="11" r="2.5" />
    </svg>
  );
}
function PlusIcon({ small }: { small?: boolean }) {
  return (
    <svg className={small ? 'w-4 h-4' : 'w-5 h-5'} fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
    </svg>
  );
}
