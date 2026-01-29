import { useState } from 'react';
import { useDatabase } from '@/hooks';
import { Button, LoadingSpinner } from '@/components/common';
import { ProjectExporter, ProjectImporter } from '@/services/export';

export function ExportPage() {
  const { db, isReady } = useDatabase();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleExport = async () => {
    if (!db) return;

    setIsExporting(true);
    setMessage(null);

    try {
      const exporter = new ProjectExporter(db);
      const blob = await exporter.exportProject();

      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `landmark-export-${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setMessage({ type: 'success', text: 'Project exported successfully!' });
    } catch (err) {
      console.error('Export failed:', err);
      setMessage({ type: 'error', text: 'Failed to export project. Please try again.' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (mode: 'replace' | 'merge') => {
    if (!db) return;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.zip';

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setIsImporting(true);
      setMessage(null);

      try {
        const importer = new ProjectImporter(db);
        const result = await importer.importProject(file, mode);

        setMessage({
          type: 'success',
          text: `Imported ${result.featuresImported} features, ${result.observationsImported} observations, ${result.measurementsImported} measurements, ${result.tasksImported} tasks.`,
        });

        // Reload the page to refresh all data
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } catch (err) {
        console.error('Import failed:', err);
        setMessage({ type: 'error', text: 'Failed to import project. Please check the file format.' });
      } finally {
        setIsImporting(false);
      }
    };

    input.click();
  };

  return (
    <div className="h-full flex flex-col bg-stone-50">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 px-4 py-3 safe-top">
        <h1 className="text-xl font-semibold text-stone-900">Export & Import</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Export Section */}
        <section className="bg-white rounded-lg p-4">
          <h2 className="text-lg font-semibold text-stone-900 mb-2">Export Project</h2>
          <p className="text-sm text-stone-600 mb-4">
            Download your entire project as a ZIP file. This includes all features, observations,
            measurements, tasks, and media files.
          </p>
          <Button onClick={handleExport} isLoading={isExporting} className="w-full">
            {isExporting ? 'Exporting...' : 'Export Project'}
          </Button>
        </section>

        {/* Import Section */}
        <section className="bg-white rounded-lg p-4">
          <h2 className="text-lg font-semibold text-stone-900 mb-2">Import Project</h2>
          <p className="text-sm text-stone-600 mb-4">
            Import a previously exported Landmark project.
          </p>

          <div className="space-y-3">
            <Button
              variant="secondary"
              onClick={() => handleImport('merge')}
              isLoading={isImporting}
              className="w-full"
            >
              Import & Merge
            </Button>
            <p className="text-xs text-stone-500 text-center">
              Adds imported data to existing data (recommended)
            </p>

            <div className="border-t border-stone-200 pt-3 mt-3">
              <Button
                variant="danger"
                onClick={() => handleImport('replace')}
                isLoading={isImporting}
                className="w-full"
              >
                Import & Replace
              </Button>
              <p className="text-xs text-stone-500 text-center mt-1">
                Replaces all existing data with imported data
              </p>
            </div>
          </div>
        </section>

        {/* Message */}
        {message && (
          <div
            className={`p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-50 text-green-700'
                : 'bg-red-50 text-red-700'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Info */}
        <section className="text-sm text-stone-500 space-y-2">
          <p>
            <strong>Export format:</strong> ZIP archive containing JSON data and media files.
          </p>
          <p>
            <strong>Data portability:</strong> Your data is stored in open formats (JSON, SQLite) with
            no proprietary lock-in.
          </p>
        </section>
      </div>
    </div>
  );
}
