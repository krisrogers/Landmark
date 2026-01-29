export type TaskStatus = 'planned' | 'active' | 'done' | 'abandoned';

export interface Task {
  id: string;
  featureId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority?: number; // 1-5
  dueDate?: Date;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface CreateTaskInput {
  featureId: string;
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: number;
  dueDate?: Date;
  tags?: string[];
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: number;
  dueDate?: Date;
  tags?: string[];
}

export interface TaskFilters {
  status?: TaskStatus[];
  tags?: string[];
  featureId?: string;
  geometryType?: string;
  hasDueDate?: boolean;
  overdue?: boolean;
}
