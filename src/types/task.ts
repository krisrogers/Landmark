import type { PointGeometry } from './feature';

export type TaskStatus = 'planned' | 'active' | 'done' | 'abandoned';

/** What a task is attached to. A task may also be standalone (no subject). */
export type TaskSubjectType = 'place' | 'asset';

export type RecurrenceUnit = 'days' | 'weeks' | 'months' | 'years';

export interface Task {
  id: string;
  /** Subject the task hangs off — a Place or an Asset. Undefined = standalone. */
  subjectType?: TaskSubjectType;
  subjectId?: string;
  /** Back-compat mirror of subjectId when the subject is a Place (feature). */
  featureId?: string;
  /** Optional map pin for a standalone task with no subject. */
  location?: PointGeometry;
  title: string;
  description?: string;
  status: TaskStatus;
  priority?: number; // 1-5
  dueDate?: Date;
  /** "Remind me by" date (deliberately not a hard deadline). */
  reminderDate?: Date;
  /** When snoozed, the reminder is suppressed until this time. */
  snoozedUntil?: Date;
  /** Fixed-interval recurrence, e.g. { interval: 12, unit: 'months' }. */
  recurrenceInterval?: number;
  recurrenceUnit?: RecurrenceUnit;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface CreateTaskInput {
  subjectType?: TaskSubjectType;
  subjectId?: string;
  featureId?: string;
  location?: PointGeometry;
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: number;
  dueDate?: Date;
  reminderDate?: Date;
  recurrenceInterval?: number;
  recurrenceUnit?: RecurrenceUnit;
  tags?: string[];
}

export interface UpdateTaskInput {
  subjectType?: TaskSubjectType;
  subjectId?: string;
  location?: PointGeometry | null;
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: number;
  dueDate?: Date;
  reminderDate?: Date | null;
  snoozedUntil?: Date | null;
  recurrenceInterval?: number | null;
  recurrenceUnit?: RecurrenceUnit | null;
  tags?: string[];
}

export interface TaskFilters {
  status?: TaskStatus[];
  tags?: string[];
  featureId?: string;
  subjectType?: TaskSubjectType;
  subjectId?: string;
  geometryType?: string;
  hasDueDate?: boolean;
  overdue?: boolean;
}
