export type MediaType = 'photo' | 'audio' | 'video' | 'document';

export interface Media {
  id: string;
  featureId?: string;
  observationId?: string;
  type: MediaType;
  filename: string;
  storagePath: string;
  mimeType: string;
  sizeBytes?: number;
  width?: number;
  height?: number;
  durationSeconds?: number;
  caption?: string;
  recordedAt: Date;
  createdAt: Date;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
}

export interface CreateMediaInput {
  featureId?: string;
  observationId?: string;
  type: MediaType;
  filename: string;
  storagePath: string;
  mimeType: string;
  sizeBytes?: number;
  width?: number;
  height?: number;
  durationSeconds?: number;
  caption?: string;
  recordedAt?: Date;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
}

export interface MediaReference {
  id: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
}
