import { useState, useEffect } from 'react';
import { Modal } from '@/components/common';
import { useDatabase } from '@/hooks';
import { getAllTemplates } from '@/services/database/queries';
import { loadBundledTemplates } from '@/services/templates';
import type { Template, GeometryType } from '@/types';

interface TemplatePickerProps {
  isOpen: boolean;
  geometryType: GeometryType;
  onSelect: (template: Template | null) => void;
  onCancel: () => void;
}

export function TemplatePicker({ isOpen, geometryType, onSelect, onCancel }: TemplatePickerProps) {
  const { db } = useDatabase();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!db || !isOpen) return;

    async function load() {
      setIsLoading(true);
      try {
        await loadBundledTemplates(db!);
        const all = await getAllTemplates(db!);
        // Filter to templates that support this geometry type
        const compatible = all.filter((t) =>
          t.schema.geometryTypes.includes(geometryType)
        );
        setTemplates(compatible);
      } catch (err) {
        console.error('Failed to load templates:', err);
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, [db, isOpen, geometryType]);

  return (
    <Modal isOpen={isOpen} onClose={onCancel} title="Choose a template" size="sm">
      {isLoading ? (
        <div className="py-8 text-center text-stone-500">Loading templates...</div>
      ) : (
        <div className="space-y-2">
          {templates.map((template) => (
            <button
              key={template.id}
              onClick={() => onSelect(template)}
              className="w-full flex items-start gap-3 p-3 rounded-lg hover:bg-stone-50 active:bg-stone-100 transition-colors text-left"
            >
              <span className="text-2xl leading-none mt-0.5">{template.icon || '📍'}</span>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-stone-900">{template.name}</div>
                {template.description && (
                  <div className="text-sm text-stone-500 truncate">{template.description}</div>
                )}
              </div>
            </button>
          ))}

          <div className="border-t border-stone-200 pt-2 mt-2">
            <button
              onClick={() => onSelect(null)}
              className="w-full flex items-start gap-3 p-3 rounded-lg hover:bg-stone-50 active:bg-stone-100 transition-colors text-left"
            >
              <span className="text-2xl leading-none mt-0.5">-</span>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-stone-500">No template</div>
                <div className="text-sm text-stone-400">Start with a blank feature</div>
              </div>
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
