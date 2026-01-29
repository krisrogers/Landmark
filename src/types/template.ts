import type { GeometryType } from './feature';

export interface MeasurementField {
  metric: string;
  label: string;
  unit: string;
  defaultMethod?: 'estimated' | 'measured' | 'derived';
}

export interface PropertyField {
  type: 'string' | 'number' | 'date' | 'boolean' | 'select';
  label: string;
  required?: boolean;
  options?: string[];
  defaultValue?: unknown;
}

export interface TemplateSchema {
  geometryTypes: GeometryType[];
  defaultTags: string[];
  measurements: MeasurementField[];
  suggestedTasks: string[];
  properties: Record<string, PropertyField>;
}

export interface Template {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  isBuiltin: boolean;
  schema: TemplateSchema;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTemplateInput {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  schema: TemplateSchema;
}

export interface UpdateTemplateInput {
  name?: string;
  description?: string;
  icon?: string;
  schema?: TemplateSchema;
}

export const TEMPLATE_ICONS = [
  'tree',
  'droplet',
  'shovel',
  'fence',
  'leaf',
  'flower',
  'mountain',
  'sun',
  'cloud',
  'thermometer',
  'ruler',
  'map-pin',
  'layers',
  'grid',
  'circle',
] as const;
