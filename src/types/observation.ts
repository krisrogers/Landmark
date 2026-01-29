export interface Observation {
  id: string;
  featureId: string;
  notes?: string;
  tags: string[];
  recordedAt: Date;
  createdAt: Date;
  observerLatitude?: number;
  observerLongitude?: number;
  observerAccuracy?: number;
}

export interface CreateObservationInput {
  featureId: string;
  notes?: string;
  tags?: string[];
  recordedAt?: Date;
  observerLatitude?: number;
  observerLongitude?: number;
  observerAccuracy?: number;
}

export interface UpdateObservationInput {
  notes?: string;
  tags?: string[];
}
