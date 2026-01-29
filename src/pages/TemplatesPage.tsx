import { useState, useEffect } from 'react';
import { useDatabase } from '@/hooks';
import { getAllTemplates, createTemplate } from '@/services/database/queries';
import { loadBundledTemplates } from '@/services/templates/TemplateService';
import { LoadingSpinner, Button, Modal } from '@/components/common';
import { TemplateEditor } from '@/components/templates/TemplateEditor';
import type { Template } from '@/types';

export function TemplatesPage() {
  const { db, isReady } = useDatabase();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [showEditor, setShowEditor] = useState(false);

  useEffect(() => {
    if (!isReady || !db) return;

    async function loadTemplates() {
      setIsLoading(true);
      try {
        // Ensure bundled templates are loaded
        await loadBundledTemplates(db);

        const result = await getAllTemplates(db);
        setTemplates(result);
      } catch (err) {
        console.error('Failed to load templates:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadTemplates();
  }, [isReady, db]);

  const handleRefresh = async () => {
    if (!db) return;
    const result = await getAllTemplates(db);
    setTemplates(result);
  };

  return (
    <div className="h-full flex flex-col bg-stone-50">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 px-4 py-3 safe-top">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-stone-900">Templates</h1>
          <Button
            size="sm"
            onClick={() => {
              setSelectedTemplate(null);
              setShowEditor(true);
            }}
          >
            New Template
          </Button>
        </div>
      </header>

      {/* Template list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : templates.length === 0 ? (
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
                d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z"
              />
            </svg>
            <p className="text-stone-500 text-center">No templates found</p>
          </div>
        ) : (
          <div className="divide-y divide-stone-200">
            {templates.map((template) => (
              <TemplateItem
                key={template.id}
                template={template}
                onClick={() => {
                  setSelectedTemplate(template);
                  setShowEditor(true);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Template Editor Modal */}
      <Modal
        isOpen={showEditor}
        onClose={() => setShowEditor(false)}
        title={selectedTemplate ? `Edit: ${selectedTemplate.name}` : 'New Template'}
        size="lg"
      >
        <TemplateEditor
          template={selectedTemplate}
          onSave={() => {
            setShowEditor(false);
            handleRefresh();
          }}
          onCancel={() => setShowEditor(false)}
        />
      </Modal>
    </div>
  );
}

interface TemplateItemProps {
  template: Template;
  onClick: () => void;
}

function TemplateItem({ template, onClick }: TemplateItemProps) {
  const geometryIcons: Record<string, string> = {
    Point: '📍',
    LineString: '📏',
    Polygon: '⬡',
  };

  return (
    <div
      onClick={onClick}
      className="bg-white px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-stone-50 transition-colors"
    >
      <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center text-lg">
        {template.icon || '📋'}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-stone-900">{template.name}</p>
          {template.isBuiltin && (
            <span className="text-xs px-1.5 py-0.5 bg-stone-100 text-stone-500 rounded">
              Built-in
            </span>
          )}
        </div>

        {template.description && (
          <p className="text-sm text-stone-500 line-clamp-1">{template.description}</p>
        )}

        <div className="flex items-center gap-2 mt-1">
          {template.schema.geometryTypes.map((type) => (
            <span key={type} className="text-xs text-stone-400">
              {geometryIcons[type]} {type}
            </span>
          ))}
        </div>
      </div>

      <svg
        className="w-5 h-5 text-stone-400 flex-shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </div>
  );
}
