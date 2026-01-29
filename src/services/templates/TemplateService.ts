import type { DatabaseService } from '../database/DatabaseService';
import { getTemplateById, createTemplate, getTemplateCount } from '../database/queries/templates';
import type { TemplateSchema } from '@/types';

interface BundledTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  schema: TemplateSchema;
}

const BUNDLED_TEMPLATES: BundledTemplate[] = [
  {
    id: 'generic-feature',
    name: 'Generic Feature',
    description: 'A general-purpose feature for any location',
    icon: '📍',
    schema: {
      geometryTypes: ['Point', 'LineString', 'Polygon'],
      defaultTags: [],
      measurements: [],
      suggestedTasks: ['Inspect', 'Photograph', 'Mark boundary'],
      properties: {},
    },
  },
  {
    id: 'tree',
    name: 'Tree',
    description: 'Individual tree or significant woody plant',
    icon: '🌳',
    schema: {
      geometryTypes: ['Point'],
      defaultTags: ['tree', 'planting'],
      measurements: [
        { metric: 'height', label: 'Height', unit: 'm', defaultMethod: 'estimated' },
        { metric: 'dbh', label: 'Diameter at Breast Height', unit: 'cm', defaultMethod: 'measured' },
        { metric: 'canopy_diameter', label: 'Canopy Diameter', unit: 'm', defaultMethod: 'estimated' },
      ],
      suggestedTasks: ['Water', 'Mulch', 'Prune', 'Stake', 'Fertilize', 'Check health'],
      properties: {
        species: { type: 'string', label: 'Species' },
        commonName: { type: 'string', label: 'Common Name' },
        plantedDate: { type: 'date', label: 'Date Planted' },
        source: {
          type: 'select',
          label: 'Source',
          options: ['Nursery', 'Seed', 'Cutting', 'Volunteer', 'Unknown'],
        },
        isNative: { type: 'boolean', label: 'Native Species', defaultValue: false },
      },
    },
  },
  {
    id: 'planting-row',
    name: 'Planting Row',
    description: 'A row of plants or crop line',
    icon: '🌱',
    schema: {
      geometryTypes: ['LineString'],
      defaultTags: ['planting', 'row'],
      measurements: [
        { metric: 'length', label: 'Row Length', unit: 'm', defaultMethod: 'measured' },
        { metric: 'spacing', label: 'Plant Spacing', unit: 'cm', defaultMethod: 'measured' },
        { metric: 'plant_count', label: 'Plant Count', unit: 'count', defaultMethod: 'measured' },
      ],
      suggestedTasks: ['Plant', 'Weed', 'Irrigate', 'Harvest', 'Replant gaps'],
      properties: {
        crop: { type: 'string', label: 'Crop/Species' },
        plantedDate: { type: 'date', label: 'Date Planted' },
        rowNumber: { type: 'number', label: 'Row Number' },
      },
    },
  },
  {
    id: 'water-point',
    name: 'Water Point',
    description: 'Spring, well, tank, or other water source',
    icon: '💧',
    schema: {
      geometryTypes: ['Point'],
      defaultTags: ['water'],
      measurements: [
        { metric: 'flow_rate', label: 'Flow Rate', unit: 'L/min', defaultMethod: 'measured' },
        { metric: 'depth', label: 'Depth', unit: 'm', defaultMethod: 'measured' },
        { metric: 'capacity', label: 'Capacity', unit: 'L', defaultMethod: 'measured' },
        { metric: 'ph', label: 'pH Level', unit: 'pH', defaultMethod: 'measured' },
      ],
      suggestedTasks: ['Test water quality', 'Clean', 'Repair', 'Monitor level'],
      properties: {
        waterType: {
          type: 'select',
          label: 'Water Type',
          options: ['Spring', 'Well', 'Tank', 'Dam', 'Creek', 'Bore', 'Other'],
        },
        isPotable: { type: 'boolean', label: 'Potable', defaultValue: false },
        isPerennial: { type: 'boolean', label: 'Perennial', defaultValue: true },
      },
    },
  },
  {
    id: 'soil-pit',
    name: 'Soil Pit',
    description: 'Soil test location or observation pit',
    icon: '🕳️',
    schema: {
      geometryTypes: ['Point'],
      defaultTags: ['soil', 'test'],
      measurements: [
        { metric: 'depth', label: 'Pit Depth', unit: 'cm', defaultMethod: 'measured' },
        { metric: 'topsoil_depth', label: 'Topsoil Depth', unit: 'cm', defaultMethod: 'measured' },
        { metric: 'ph', label: 'pH Level', unit: 'pH', defaultMethod: 'measured' },
      ],
      suggestedTasks: ['Collect sample', 'Send for testing', 'Photograph layers', 'Backfill'],
      properties: {
        soilTexture: {
          type: 'select',
          label: 'Soil Texture',
          options: ['Sand', 'Sandy Loam', 'Loam', 'Clay Loam', 'Clay', 'Silt'],
        },
        drainage: {
          type: 'select',
          label: 'Drainage',
          options: ['Excellent', 'Good', 'Moderate', 'Poor', 'Very Poor'],
        },
        color: { type: 'string', label: 'Soil Color' },
      },
    },
  },
  {
    id: 'weed-patch',
    name: 'Weed Patch',
    description: 'Area of weeds or invasive species',
    icon: '🌿',
    schema: {
      geometryTypes: ['Point', 'Polygon'],
      defaultTags: ['weed', 'invasive'],
      measurements: [
        { metric: 'area', label: 'Affected Area', unit: 'm²', defaultMethod: 'estimated' },
        { metric: 'density', label: 'Density', unit: '%', defaultMethod: 'estimated' },
        { metric: 'height', label: 'Average Height', unit: 'cm', defaultMethod: 'estimated' },
      ],
      suggestedTasks: ['Remove manually', 'Spray', 'Mulch', 'Monitor regrowth', 'Revegetate'],
      properties: {
        species: { type: 'string', label: 'Weed Species' },
        severity: {
          type: 'select',
          label: 'Severity',
          options: ['Low', 'Medium', 'High', 'Critical'],
        },
        isSpreading: { type: 'boolean', label: 'Actively Spreading', defaultValue: false },
      },
    },
  },
];

export async function loadBundledTemplates(db: DatabaseService): Promise<void> {
  // Check if templates are already loaded
  const count = await getTemplateCount(db);
  if (count > 0) {
    return; // Templates already exist
  }

  // Load bundled templates
  for (const template of BUNDLED_TEMPLATES) {
    try {
      const existing = await getTemplateById(db, template.id);
      if (!existing) {
        await createTemplate(db, template, true);
      }
    } catch (err) {
      console.error(`Failed to load template ${template.id}:`, err);
    }
  }
}

export function getBundledTemplates(): BundledTemplate[] {
  return BUNDLED_TEMPLATES;
}
