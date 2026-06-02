import JSZip from 'jszip';
import type { DatabaseService } from '../database/DatabaseService';
import {
  getAllFeatures,
  getAllObservations,
  getAllMeasurements,
  getAllTasks,
  getAllTemplates,
  getAllMedia,
} from '../database/queries';

interface ExportManifest {
  version: string;
  exportedAt: string;
  appVersion: string;
  statistics: {
    featureCount: number;
    observationCount: number;
    measurementCount: number;
    taskCount: number;
    mediaCount: number;
    templateCount: number;
  };
}

export class ProjectExporter {
  constructor(private db: DatabaseService) {}

  async exportProject(): Promise<Blob> {
    const zip = new JSZip();

    // Gather all data
    const [features, observations, measurements, tasks, templates, media] = await Promise.all([
      getAllFeatures(this.db),
      getAllObservations(this.db),
      getAllMeasurements(this.db),
      getAllTasks(this.db),
      getAllTemplates(this.db),
      getAllMedia(this.db),
    ]);

    // Create manifest
    const manifest: ExportManifest = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      appVersion: '1.0.0',
      statistics: {
        featureCount: features.length,
        observationCount: observations.length,
        measurementCount: measurements.length,
        taskCount: tasks.length,
        mediaCount: media.length,
        templateCount: templates.length,
      },
    };

    zip.file('manifest.json', JSON.stringify(manifest, null, 2));

    // Export data
    const data = {
      features,
      observations,
      measurements,
      tasks,
      templates: templates.filter((t) => !t.isBuiltin), // Only custom templates
      media: media.map((m) => ({
        ...m,
        // Don't include binary data in JSON
        storagePath: m.storagePath,
      })),
    };

    zip.file('data.json', JSON.stringify(data, null, 2));

    // Note: In a full implementation, we would also export media files
    // For now, we just export the metadata

    return zip.generateAsync({ type: 'blob' });
  }
}
