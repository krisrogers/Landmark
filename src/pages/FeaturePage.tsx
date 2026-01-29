import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useFeatureStore } from '@/store';
import { useDatabase } from '@/hooks';
import { getObservationsByFeatureId, getMeasurementsByFeatureId, getTasksByFeatureId, getMediaByFeatureId } from '@/services/database/queries';
import { calculatePolygonArea, calculateLineLength, formatArea, formatDistance } from '@/services/geo';
import { Button, Modal, ConfirmModal, LoadingSpinner } from '@/components/common';
import { FeatureForm } from '@/components/features/FeatureForm';
import { FeatureTimeline } from '@/components/features/FeatureTimeline';
import { ObservationForm } from '@/components/observations/ObservationForm';
import { MeasurementForm } from '@/components/measurements/MeasurementForm';
import { TaskForm } from '@/components/tasks/TaskForm';
import type { Feature, Observation, Measurement, Task, Media } from '@/types';

export function FeaturePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { db, isReady } = useDatabase();
  const { features, deleteFeature, loadFeatures } = useFeatureStore();

  const [feature, setFeature] = useState<Feature | null>(null);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [media, setMedia] = useState<Media[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [showEditModal, setShowEditModal] = useState(searchParams.get('edit') === 'true');
  const [showObservationModal, setShowObservationModal] = useState(false);
  const [showMeasurementModal, setShowMeasurementModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Load feature and related data
  useEffect(() => {
    if (!isReady || !db || !id) return;

    async function loadData() {
      setIsLoading(true);
      try {
        // Get feature from store or reload
        let f = features.find((f) => f.id === id);
        if (!f) {
          await loadFeatures();
          f = features.find((f) => f.id === id);
        }

        if (f) {
          setFeature(f);

          // Load related data
          const [obs, meas, tsks, med] = await Promise.all([
            getObservationsByFeatureId(db!, id!),
            getMeasurementsByFeatureId(db!, id!),
            getTasksByFeatureId(db!, id!),
            getMediaByFeatureId(db!, id!),
          ]);

          setObservations(obs);
          setMeasurements(meas);
          setTasks(tsks);
          setMedia(med);
        }
      } catch (err) {
        console.error('Failed to load feature:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [isReady, db, id, features, loadFeatures]);

  const handleDelete = async () => {
    if (!id) return;

    try {
      await deleteFeature(id);
      navigate('/');
    } catch (err) {
      console.error('Failed to delete feature:', err);
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  const refreshData = async () => {
    if (!db || !id) return;

    const [obs, meas, tsks, med] = await Promise.all([
      getObservationsByFeatureId(db, id),
      getMeasurementsByFeatureId(db, id),
      getTasksByFeatureId(db, id),
      getMediaByFeatureId(db, id),
    ]);

    setObservations(obs);
    setMeasurements(meas);
    setTasks(tsks);
    setMedia(med);
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!feature) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-4">
        <h2 className="text-xl font-semibold text-stone-900 mb-2">Feature Not Found</h2>
        <p className="text-stone-600 mb-4">This feature may have been deleted.</p>
        <Button onClick={() => navigate('/')}>Back to Map</Button>
      </div>
    );
  }

  const geometryInfo = getGeometryInfo(feature);

  return (
    <div className="h-full flex flex-col bg-stone-50">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 px-4 py-3 safe-top">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="p-2 -ml-2 hover:bg-stone-100 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold text-stone-900 truncate">{feature.name}</h1>
            <p className="text-sm text-stone-500">{feature.geometryType} • {geometryInfo}</p>
          </div>
          <button
            onClick={() => setShowEditModal(true)}
            className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        </div>

        {/* Tags */}
        {feature.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {feature.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 bg-primary-100 text-primary-700 text-xs font-medium rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Description */}
        {feature.description && (
          <p className="text-sm text-stone-600 mt-2">{feature.description}</p>
        )}
      </header>

      {/* Quick Actions */}
      <div className="bg-white border-b border-stone-200 px-4 py-2">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setShowObservationModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-stone-100 text-stone-700 rounded-full text-sm font-medium hover:bg-stone-200 whitespace-nowrap"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Add Observation
          </button>
          <button
            onClick={() => setShowMeasurementModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-stone-100 text-stone-700 rounded-full text-sm font-medium hover:bg-stone-200 whitespace-nowrap"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Add Measurement
          </button>
          <button
            onClick={() => setShowTaskModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-stone-100 text-stone-700 rounded-full text-sm font-medium hover:bg-stone-200 whitespace-nowrap"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Add Task
          </button>
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto">
        <FeatureTimeline
          observations={observations}
          measurements={measurements}
          tasks={tasks}
          media={media}
          onRefresh={refreshData}
        />
      </div>

      {/* Footer with delete */}
      <div className="bg-white border-t border-stone-200 px-4 py-3 safe-bottom">
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="w-full text-red-600 text-sm font-medium py-2 hover:bg-red-50 rounded-lg transition-colors"
        >
          Delete Feature
        </button>
      </div>

      {/* Modals */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Feature"
      >
        <FeatureForm
          feature={feature}
          onSuccess={() => {
            setShowEditModal(false);
            loadFeatures();
          }}
          onCancel={() => setShowEditModal(false)}
        />
      </Modal>

      <Modal
        isOpen={showObservationModal}
        onClose={() => setShowObservationModal(false)}
        title="Add Observation"
      >
        <ObservationForm
          featureId={feature.id}
          onSuccess={() => {
            setShowObservationModal(false);
            refreshData();
          }}
          onCancel={() => setShowObservationModal(false)}
        />
      </Modal>

      <Modal
        isOpen={showMeasurementModal}
        onClose={() => setShowMeasurementModal(false)}
        title="Add Measurement"
      >
        <MeasurementForm
          featureId={feature.id}
          onSuccess={() => {
            setShowMeasurementModal(false);
            refreshData();
          }}
          onCancel={() => setShowMeasurementModal(false)}
        />
      </Modal>

      <Modal
        isOpen={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        title="Add Task"
      >
        <TaskForm
          featureId={feature.id}
          onSuccess={() => {
            setShowTaskModal(false);
            refreshData();
          }}
          onCancel={() => setShowTaskModal(false)}
        />
      </Modal>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Feature"
        message={`Are you sure you want to delete "${feature.name}"? This will also delete all observations, measurements, and tasks associated with this feature.`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}

function getGeometryInfo(feature: Feature): string {
  switch (feature.geometryType) {
    case 'Point':
      const coords = feature.geometry.coordinates as [number, number];
      return `${coords[1].toFixed(5)}, ${coords[0].toFixed(5)}`;
    case 'LineString':
      const length = calculateLineLength(feature.geometry as any);
      return formatDistance(length);
    case 'Polygon':
      const area = calculatePolygonArea(feature.geometry as any);
      return formatArea(area);
    default:
      return '';
  }
}
