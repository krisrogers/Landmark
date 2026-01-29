import JSZip from 'jszip';
import type { DatabaseService } from '../database/DatabaseService';
import {
  createFeature,
  createObservation,
  createMeasurement,
  createTask,
  createTemplate,
  deleteFeature,
  getAllFeatures,
} from '../database/queries';
import type { Feature, Observation, Measurement, Task, Template } from '@/types';

interface ImportResult {
  featuresImported: number;
  observationsImported: number;
  measurementsImported: number;
  tasksImported: number;
  templatesImported: number;
}

interface ExportData {
  features: Feature[];
  observations: Observation[];
  measurements: Measurement[];
  tasks: Task[];
  templates: Template[];
  media: unknown[];
}

export class ProjectImporter {
  constructor(private db: DatabaseService) {}

  async importProject(file: Blob, mode: 'replace' | 'merge'): Promise<ImportResult> {
    const zip = await JSZip.loadAsync(file);

    // Read manifest
    const manifestFile = zip.file('manifest.json');
    if (!manifestFile) {
      throw new Error('Invalid export file: missing manifest.json');
    }

    const manifestText = await manifestFile.async('text');
    const manifest = JSON.parse(manifestText);

    if (!manifest.version || manifest.version !== '1.0') {
      throw new Error(`Unsupported export version: ${manifest.version}`);
    }

    // Read data
    const dataFile = zip.file('data.json');
    if (!dataFile) {
      throw new Error('Invalid export file: missing data.json');
    }

    const dataText = await dataFile.async('text');
    const data: ExportData = JSON.parse(dataText);

    // If replacing, delete all existing data
    if (mode === 'replace') {
      const existingFeatures = await getAllFeatures(this.db);
      for (const feature of existingFeatures) {
        await deleteFeature(this.db, feature.id);
      }
    }

    const result: ImportResult = {
      featuresImported: 0,
      observationsImported: 0,
      measurementsImported: 0,
      tasksImported: 0,
      templatesImported: 0,
    };

    // Import templates first
    for (const template of data.templates || []) {
      try {
        await createTemplate(this.db, {
          id: template.id,
          name: template.name,
          description: template.description,
          icon: template.icon,
          schema: template.schema,
        });
        result.templatesImported++;
      } catch (err) {
        console.warn('Failed to import template:', template.id, err);
      }
    }

    // Import features
    for (const feature of data.features || []) {
      try {
        await createFeature(this.db, {
          name: feature.name,
          description: feature.description,
          geometryType: feature.geometryType,
          geometry: feature.geometry,
          templateId: feature.templateId,
          tags: feature.tags,
          properties: feature.properties,
        });
        result.featuresImported++;
      } catch (err) {
        console.warn('Failed to import feature:', feature.id, err);
      }
    }

    // Import observations
    for (const observation of data.observations || []) {
      try {
        await createObservation(this.db, {
          featureId: observation.featureId,
          notes: observation.notes,
          tags: observation.tags,
          recordedAt: new Date(observation.recordedAt),
          observerLatitude: observation.observerLatitude,
          observerLongitude: observation.observerLongitude,
          observerAccuracy: observation.observerAccuracy,
        });
        result.observationsImported++;
      } catch (err) {
        console.warn('Failed to import observation:', observation.id, err);
      }
    }

    // Import measurements
    for (const measurement of data.measurements || []) {
      try {
        await createMeasurement(this.db, {
          featureId: measurement.featureId,
          metric: measurement.metric,
          value: measurement.value,
          unit: measurement.unit,
          method: measurement.method,
          accuracy: measurement.accuracy,
          confidence: measurement.confidence,
          notes: measurement.notes,
          recordedAt: new Date(measurement.recordedAt),
        });
        result.measurementsImported++;
      } catch (err) {
        console.warn('Failed to import measurement:', measurement.id, err);
      }
    }

    // Import tasks
    for (const task of data.tasks || []) {
      try {
        await createTask(this.db, {
          featureId: task.featureId,
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
          tags: task.tags,
        });
        result.tasksImported++;
      } catch (err) {
        console.warn('Failed to import task:', task.id, err);
      }
    }

    return result;
  }
}
