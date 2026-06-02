export type MeasurementMethod = 'estimated' | 'measured' | 'derived';
export type ConfidenceLevel = 'low' | 'medium' | 'high';

export interface Measurement {
  id: string;
  featureId: string;
  metric: string;
  value: number;
  unit: string;
  method: MeasurementMethod;
  accuracy?: number;
  confidence?: ConfidenceLevel;
  notes?: string;
  recordedAt: Date;
  createdAt: Date;
}

export interface CreateMeasurementInput {
  featureId: string;
  metric: string;
  value: number;
  unit: string;
  method?: MeasurementMethod;
  accuracy?: number;
  confidence?: ConfidenceLevel;
  notes?: string;
  recordedAt?: Date;
}

export interface UpdateMeasurementInput {
  value?: number;
  unit?: string;
  method?: MeasurementMethod;
  accuracy?: number;
  confidence?: ConfidenceLevel;
  notes?: string;
}

export const COMMON_UNITS = {
  length: ['m', 'cm', 'mm', 'km', 'ft', 'in'],
  area: ['m²', 'ha', 'acre', 'km²', 'ft²'],
  volume: ['L', 'mL', 'm³', 'gal'],
  mass: ['kg', 'g', 'lb', 'oz'],
  rate: ['L/min', 'L/hr', 'm³/hr'],
  percentage: ['%'],
  count: ['count', 'units'],
  temperature: ['°C', '°F'],
} as const;
