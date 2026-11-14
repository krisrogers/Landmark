import type { DatabaseService } from '../DatabaseService';
import type {
  Task,
  CreateTaskInput,
  UpdateTaskInput,
  TaskStatus,
  TaskFilters,
  RecurrenceUnit,
} from '@/types';
import { generateId } from '@/utils/uuid';
import { toISOString, fromISOString } from '@/utils/datetime';
import { add } from 'date-fns';

interface TaskRow {
  id: string;
  subject_type: 'place' | 'asset' | null;
  subject_id: string | null;
  feature_id: string | null;
  location: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: number | null;
  due_date: string | null;
  reminder_date: string | null;
  snoozed_until: string | null;
  recurrence_interval: number | null;
  recurrence_unit: RecurrenceUnit | null;
  tags: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

function rowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    subjectType: row.subject_type || undefined,
    subjectId: row.subject_id || undefined,
    featureId: row.feature_id || undefined,
    location: row.location ? JSON.parse(row.location) : undefined,
    title: row.title,
    description: row.description || undefined,
    status: row.status,
    priority: row.priority || undefined,
    dueDate: row.due_date ? fromISOString(row.due_date) : undefined,
    reminderDate: row.reminder_date ? fromISOString(row.reminder_date) : undefined,
    snoozedUntil: row.snoozed_until ? fromISOString(row.snoozed_until) : undefined,
    recurrenceInterval: row.recurrence_interval ?? undefined,
    recurrenceUnit: row.recurrence_unit || undefined,
    tags: JSON.parse(row.tags || '[]'),
    createdAt: fromISOString(row.created_at),
    updatedAt: fromISOString(row.updated_at),
    completedAt: row.completed_at ? fromISOString(row.completed_at) : undefined,
  };
}

const ORDER_BY_STATUS = `
  CASE status
    WHEN 'active' THEN 1
    WHEN 'planned' THEN 2
    WHEN 'done' THEN 3
    WHEN 'abandoned' THEN 4
  END,
  priority DESC NULLS LAST,
  created_at DESC
`;

export async function getTasksByFeatureId(
  db: DatabaseService,
  featureId: string
): Promise<Task[]> {
  const rows = await db.all<TaskRow>(
    `SELECT * FROM tasks WHERE feature_id = ? ORDER BY ${ORDER_BY_STATUS}`,
    [featureId]
  );
  return rows.map(rowToTask);
}

export async function getTasksBySubject(
  db: DatabaseService,
  subjectType: 'place' | 'asset',
  subjectId: string
): Promise<Task[]> {
  const rows = await db.all<TaskRow>(
    `SELECT * FROM tasks WHERE subject_type = ? AND subject_id = ? ORDER BY ${ORDER_BY_STATUS}`,
    [subjectType, subjectId]
  );
  return rows.map(rowToTask);
}

export async function getTaskById(db: DatabaseService, id: string): Promise<Task | null> {
  const row = await db.get<TaskRow>('SELECT * FROM tasks WHERE id = ?', [id]);
  return row ? rowToTask(row) : null;
}

export async function getAllTasks(db: DatabaseService): Promise<Task[]> {
  const rows = await db.all<TaskRow>(`SELECT * FROM tasks ORDER BY ${ORDER_BY_STATUS}`);
  return rows.map(rowToTask);
}

export async function getTasksByStatus(
  db: DatabaseService,
  status: TaskStatus
): Promise<Task[]> {
  const rows = await db.all<TaskRow>(
    `SELECT * FROM tasks WHERE status = ? ORDER BY priority DESC NULLS LAST, created_at DESC`,
    [status]
  );
  return rows.map(rowToTask);
}

/**
 * Open tasks that carry a reminder, ordered by their effective reminder date
 * (snoozed_until overrides reminder_date). Feeds the Due view.
 */
export async function getDueTasks(db: DatabaseService): Promise<Task[]> {
  const rows = await db.all<TaskRow>(`
    SELECT * FROM tasks
    WHERE status NOT IN ('done', 'abandoned')
      AND (reminder_date IS NOT NULL OR snoozed_until IS NOT NULL)
    ORDER BY COALESCE(snoozed_until, reminder_date) ASC
  `);
  return rows.map(rowToTask);
}

export async function getFilteredTasks(
  db: DatabaseService,
  filters: TaskFilters
): Promise<Task[]> {
  let sql = 'SELECT t.* FROM tasks t';
  const params: unknown[] = [];
  const conditions: string[] = [];

  if (filters.geometryType) {
    sql += ' JOIN features f ON t.feature_id = f.id';
    conditions.push('f.geometry_type = ?');
    params.push(filters.geometryType);
  }

  if (filters.status && filters.status.length > 0) {
    conditions.push(`t.status IN (${filters.status.map(() => '?').join(', ')})`);
    params.push(...filters.status);
  }

  if (filters.featureId) {
    conditions.push('t.feature_id = ?');
    params.push(filters.featureId);
  }

  if (filters.subjectType) {
    conditions.push('t.subject_type = ?');
    params.push(filters.subjectType);
  }

  if (filters.subjectId) {
    conditions.push('t.subject_id = ?');
    params.push(filters.subjectId);
  }

  if (filters.tags && filters.tags.length > 0) {
    const tagConditions = filters.tags.map(() => 't.tags LIKE ?');
    conditions.push(`(${tagConditions.join(' OR ')})`);
    params.push(...filters.tags.map((tag) => `%"${tag}"%`));
  }

  if (filters.hasDueDate !== undefined) {
    conditions.push(filters.hasDueDate ? 't.due_date IS NOT NULL' : 't.due_date IS NULL');
  }

  if (filters.overdue) {
    conditions.push("t.due_date < date('now') AND t.status NOT IN ('done', 'abandoned')");
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  sql += ` ORDER BY
    CASE t.status
      WHEN 'active' THEN 1
      WHEN 'planned' THEN 2
      WHEN 'done' THEN 3
      WHEN 'abandoned' THEN 4
    END,
    t.priority DESC NULLS LAST,
    t.created_at DESC`;

  const rows = await db.all<TaskRow>(sql, params);
  return rows.map(rowToTask);
}

/** Resolve the subject fields (subject_type/subject_id + back-compat feature_id) from input. */
function resolveSubject(input: {
  subjectType?: 'place' | 'asset';
  subjectId?: string;
  featureId?: string;
}): { subjectType: string | null; subjectId: string | null; featureId: string | null } {
  if (input.subjectType && input.subjectId) {
    return {
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      featureId: input.subjectType === 'place' ? input.subjectId : null,
    };
  }
  if (input.featureId) {
    return { subjectType: 'place', subjectId: input.featureId, featureId: input.featureId };
  }
  return { subjectType: null, subjectId: null, featureId: null };
}

export async function createTask(
  db: DatabaseService,
  input: CreateTaskInput
): Promise<Task> {
  const id = generateId();
  const now = toISOString(new Date());
  const subject = resolveSubject(input);
  const reminder = input.reminderDate ?? input.dueDate;

  await db.run(
    `INSERT INTO tasks (
      id, subject_type, subject_id, feature_id, location, title, description, status,
      priority, due_date, reminder_date, recurrence_interval, recurrence_unit,
      tags, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      subject.subjectType,
      subject.subjectId,
      subject.featureId,
      input.location ? JSON.stringify(input.location) : null,
      input.title,
      input.description || null,
      input.status || 'planned',
      input.priority || null,
      input.dueDate ? toISOString(input.dueDate) : null,
      reminder ? toISOString(reminder) : null,
      input.recurrenceInterval ?? null,
      input.recurrenceUnit ?? null,
      JSON.stringify(input.tags || []),
      now,
      now,
    ]
  );

  const task = await getTaskById(db, id);
  if (!task) throw new Error('Failed to create task');
  return task;
}

export async function updateTask(
  db: DatabaseService,
  id: string,
  input: UpdateTaskInput
): Promise<Task> {
  const existing = await getTaskById(db, id);
  if (!existing) throw new Error('Task not found');

  const now = toISOString(new Date());
  const sets: string[] = [];
  const params: unknown[] = [];
  const set = (col: string, val: unknown) => {
    sets.push(`${col} = ?`);
    params.push(val);
  };

  if (input.title !== undefined) set('title', input.title);
  if (input.description !== undefined) set('description', input.description ?? null);
  if (input.status !== undefined) set('status', input.status);
  if (input.priority !== undefined) set('priority', input.priority ?? null);
  if (input.dueDate !== undefined) set('due_date', input.dueDate ? toISOString(input.dueDate) : null);
  if (input.reminderDate !== undefined)
    set('reminder_date', input.reminderDate ? toISOString(input.reminderDate) : null);
  if (input.snoozedUntil !== undefined)
    set('snoozed_until', input.snoozedUntil ? toISOString(input.snoozedUntil) : null);
  if (input.recurrenceInterval !== undefined)
    set('recurrence_interval', input.recurrenceInterval ?? null);
  if (input.recurrenceUnit !== undefined) set('recurrence_unit', input.recurrenceUnit ?? null);
  if (input.tags !== undefined) set('tags', JSON.stringify(input.tags));
  if (input.location !== undefined)
    set('location', input.location ? JSON.stringify(input.location) : null);
  if (input.subjectType !== undefined || input.subjectId !== undefined) {
    const subject = resolveSubject({
      subjectType: input.subjectType ?? existing.subjectType,
      subjectId: input.subjectId ?? existing.subjectId,
    });
    set('subject_type', subject.subjectType);
    set('subject_id', subject.subjectId);
    set('feature_id', subject.featureId);
  }

  // Stamp completion when transitioning into 'done'.
  if (input.status === 'done' && existing.status !== 'done') {
    set('completed_at', now);
  }

  set('updated_at', now);
  params.push(id);

  await db.run(`UPDATE tasks SET ${sets.join(', ')} WHERE id = ?`, params);

  const task = await getTaskById(db, id);
  if (!task) throw new Error('Failed to update task');
  return task;
}

export async function deleteTask(db: DatabaseService, id: string): Promise<void> {
  await db.run('DELETE FROM tasks WHERE id = ?', [id]);
}

/** Push a task's reminder out until a given time. */
export async function snoozeTask(
  db: DatabaseService,
  id: string,
  until: Date
): Promise<Task> {
  return updateTask(db, id, { snoozedUntil: until });
}

/** Clear a task's reminder without completing the task. */
export async function dismissReminder(db: DatabaseService, id: string): Promise<Task> {
  return updateTask(db, id, { reminderDate: null, snoozedUntil: null });
}

/**
 * Mark a task done. If it recurs on a fixed interval, spawn the next occurrence
 * (a fresh open task with its reminder advanced by one interval) so history is
 * preserved as a trail of completed tasks.
 */
export async function completeTask(db: DatabaseService, id: string): Promise<Task> {
  const existing = await getTaskById(db, id);
  if (!existing) throw new Error('Task not found');

  const completed = await updateTask(db, id, { status: 'done', snoozedUntil: null });

  if (existing.recurrenceInterval && existing.recurrenceUnit) {
    const base = existing.reminderDate ?? existing.dueDate ?? new Date();
    const next = add(base, { [existing.recurrenceUnit]: existing.recurrenceInterval });
    await createTask(db, {
      subjectType: existing.subjectType,
      subjectId: existing.subjectId,
      featureId: existing.subjectType ? undefined : existing.featureId,
      location: existing.location,
      title: existing.title,
      description: existing.description,
      status: 'planned',
      priority: existing.priority,
      dueDate: next,
      reminderDate: next,
      recurrenceInterval: existing.recurrenceInterval,
      recurrenceUnit: existing.recurrenceUnit,
      tags: existing.tags,
    });
  }

  return completed;
}

export async function getTaskCount(
  db: DatabaseService,
  featureId?: string,
  status?: TaskStatus
): Promise<number> {
  let sql = 'SELECT COUNT(*) as count FROM tasks';
  const params: unknown[] = [];
  const conditions: string[] = [];

  if (featureId) {
    conditions.push('feature_id = ?');
    params.push(featureId);
  }

  if (status) {
    conditions.push('status = ?');
    params.push(status);
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  const result = await db.get<{ count: number }>(sql, params);
  return result?.count || 0;
}

export async function getOverdueTasks(db: DatabaseService): Promise<Task[]> {
  const rows = await db.all<TaskRow>(`
    SELECT * FROM tasks
    WHERE reminder_date < date('now')
      AND status NOT IN ('done', 'abandoned')
    ORDER BY reminder_date ASC
  `);
  return rows.map(rowToTask);
}
