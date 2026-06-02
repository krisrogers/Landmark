import { useState } from 'react';
import { useDatabase } from '@/hooks';
import { createTemplate, updateTemplate } from '@/services/database/queries';
import { Button, Input, TextArea } from '@/components/common';
import type { Template, TemplateSchema } from '@/types';
import { generateId } from '@/utils/uuid';

interface TemplateEditorProps {
  template: Template | null;
  onSave: () => void;
  onCancel: () => void;
}

const DEFAULT_SCHEMA: TemplateSchema = {
  geometryTypes: ['Point'],
  defaultTags: [],
  measurements: [],
  suggestedTasks: [],
  properties: {},
};

export function TemplateEditor({ template, onSave, onCancel }: TemplateEditorProps) {
  const { db } = useDatabase();
  const isEditing = !!template;
  const isBuiltin = template?.isBuiltin ?? false;

  const [name, setName] = useState(template?.name ?? '');
  const [description, setDescription] = useState(template?.description ?? '');
  const [icon, setIcon] = useState(template?.icon ?? '');
  const [schemaJson, setSchemaJson] = useState(
    JSON.stringify(template?.schema ?? DEFAULT_SCHEMA, null, 2)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!db) {
      setError('Database not available');
      return;
    }

    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    let schema: TemplateSchema;
    try {
      schema = JSON.parse(schemaJson);
    } catch (err) {
      setError('Invalid JSON schema');
      return;
    }

    // Validate schema
    if (!schema.geometryTypes || !Array.isArray(schema.geometryTypes)) {
      setError('Schema must include geometryTypes array');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (isEditing && template) {
        await updateTemplate(db, template.id, {
          name: name.trim(),
          description: description.trim() || undefined,
          icon: icon.trim() || undefined,
          schema,
        });
      } else {
        await createTemplate(db, {
          id: generateId(),
          name: name.trim(),
          description: description.trim() || undefined,
          icon: icon.trim() || undefined,
          schema,
        });
      }

      onSave();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {isBuiltin && (
        <div className="p-3 bg-amber-50 text-amber-800 text-sm rounded-lg">
          This is a built-in template and cannot be modified. You can view its schema below.
        </div>
      )}

      <Input
        label="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Template name"
        required
        disabled={isBuiltin}
      />

      <TextArea
        label="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="What is this template for?"
        rows={2}
        disabled={isBuiltin}
      />

      <Input
        label="Icon (emoji)"
        value={icon}
        onChange={(e) => setIcon(e.target.value)}
        placeholder="🌳"
        disabled={isBuiltin}
      />

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">
          Schema (JSON)
        </label>
        <textarea
          value={schemaJson}
          onChange={(e) => setSchemaJson(e.target.value)}
          rows={12}
          disabled={isBuiltin}
          className={`
            w-full px-3 py-2 font-mono text-sm
            bg-stone-50 border border-stone-300 rounded-lg
            text-stone-900 focus:outline-none focus:ring-2 focus:ring-primary-500
            disabled:bg-stone-100 disabled:text-stone-500
          `}
        />
        <p className="text-xs text-stone-500 mt-1">
          Define geometryTypes, defaultTags, measurements, suggestedTasks, and properties.
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">
          {isBuiltin ? 'Close' : 'Cancel'}
        </Button>
        {!isBuiltin && (
          <Button type="submit" isLoading={isSubmitting} className="flex-1">
            {isEditing ? 'Update Template' : 'Create Template'}
          </Button>
        )}
      </div>
    </form>
  );
}
