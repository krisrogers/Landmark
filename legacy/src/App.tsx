import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { getDatabase } from './services/database';
import { LoadingOverlay } from './components/common';
import { MapPage } from './pages/MapPage';
import { FeaturePage } from './pages/FeaturePage';
import { TasksPage } from './pages/TasksPage';
import { TemplatesPage } from './pages/TemplatesPage';
import { ExportPage } from './pages/ExportPage';
import { SettingsPage } from './pages/SettingsPage';
import { Navigation } from './components/Navigation';

console.log('[App.tsx] Module loaded');

export default function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  console.log('[App] Component rendering, isInitialized:', isInitialized, 'error:', error);

  useEffect(() => {
    console.log('[App] Starting initialization...');
    // Defer initialization to next frame to let UI render first
    const timeoutId = setTimeout(async () => {
      try {
        console.log('[App] Calling getDatabase()...');
        await getDatabase();
        console.log('[App] Database initialized successfully');
        setIsInitialized(true);
      } catch (err) {
        console.error('Failed to initialize app:', err);
        const message = err instanceof Error ? err.message : String(err ?? 'Unknown error');
        setError(message);
      }
    }, 0);

    return () => clearTimeout(timeoutId);
  }, []);

  if (error) {
    console.log('[App] Rendering error UI');
    return (
      <div className="h-full flex flex-col items-center justify-center p-4">
        <div className="text-red-600 mb-4">
          <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-stone-900 mb-2">Failed to Initialize</h1>
        <p className="text-stone-600 text-center mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!isInitialized) {
    console.log('[App] Rendering loading spinner');
    return <LoadingOverlay message="Initializing Landmark..." />;
  }

  console.log('[App] Rendering main UI');
  return (
    <div className="h-full flex flex-col">
      <main className="flex-1 overflow-hidden">
        <Routes>
          <Route path="/" element={<MapPage />} />
          <Route path="/feature/:id" element={<FeaturePage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/templates" element={<TemplatesPage />} />
          <Route path="/export" element={<ExportPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Navigation />
    </div>
  );
}
