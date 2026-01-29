import type { DatabaseService } from '../DatabaseService';
import type { Task, CreateTaskInput, UpdateTaskInput, TaskStatus, TaskFilters } from '@/types';
import { generateId } from '@/utils/uuid';
import { toISOString, fromISOString } from '@/utils/datetime';

interface TaskRow {
  id: string;
  feature_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: number | null;
  due_date: string | null;
  tags: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

function rowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    featureId: row.feature_id,
    title: row.title,
    description: row.description || undefined,
    status: row.status,
    priority: row.priority || undefined,
    dueDate: row.due_date ? fromISOString(row.due_date) : undefined,
    tags: JSON.parse(row.tags || '[]'),
    createdAt: fromISOString(row.created_at),
    updatedAt: fromISOString(row.updated_at),
    completedAt: row.completed_at ? fromISOString(row.completed_at) : undefined,
  };
}

export async function getTasksByFeatureId(
  db: DatabaseService,
  featureId: string
): Promise<Task[]> {
  const rows = await db.all<TaskRow>(`
    SELECT * FROM tasks
    WHERE feature_id = ?
    ORDER BY
      CASE status
        WHEN 'active' THEN 1
        WHEN 'planned' THEN 2
        WHEN 'done' THEN 3
        WHEN 'abandoned' THEN 4
      END,
      priority DESC NULLS LAST,
      created_at DESC
  `, [featureId]);
  return rows.map(rowToTask);
}

export async function getTaskById(db: DatabaseService, id: string): Promise<Task | null> {
  const row = await db.get<TaskRow>('SELECT * FROM tasks WHERE id = ?', [id]);
  return row ? rowToTask(row) : null;
}

export async function getAllTasks(db: DatabaseService): Promise<Task[]> {
  const rows = await db.all<TaskRow>(`
    SELECT * FROM tasks
    ORDER BY
      CASE status
        WHEN 'active' THEN 1
        WHEN 'planned' THEN 2
        WHEN 'done' THEN 3
        WHEN 'abandoned' THEN 4
      END,
      priority DESC NULLS LAST,
      created_at DESC
  `);
  return rows.map(rowToTask);
}

export async function getTasksByStatus(
  db: DatabaseService,
  status: TaskStatus
): Promise<Task[]> {
  const rows = await db.all<TaskRow>(`
    SELECT * FROM tasks
    WHERE status = ?
    ORDER BY priority DESC NULLS LAST, created_at DESC
  `, [status]);
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

  if (filters.tags && filters.tags.length > 0) {
    const tagConditions = filters.tags.map(() => 't.tags LIKE ?');
    conditions.push(`(${tagConditions.join(' OR ')})`);
    params.push(...filters.tags.map(tag => `%"${tag}"%`));
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

export async function createTask(
  db: DatabaseService,
  input: CreateTaskInput
): Promise<Task> {
  const id = generateId();
  const now = toISOString(new Date());

  await db.run(`
    INSERT INTO tasks (
      id, feature_id, title, description, status,
      priority, due_date, tags, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id,
    input.featureId,
    input.title,
    input.description || null,
    input.status || 'planned',
    input.priority || null,
    input.dueDate ? toISOString(input.dueDate) : null,
    JSON.stringify(input.tags || []),
    now,
    now,
  ]);

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
  const completedAt = input.status === 'done' && existing.status !== 'done' ? now : null;

  await db.run(`
    UPDATE tasks SET
      title = COALESCE(?, title),
      description = COALESCE(?, description),
      status = COALESCE(?, status),
      priority = COALESCE(?, priority),
      due_date = COALESCE(?, due_date),
      tags = COALESCE(?, tags),
      updated_at = ?,
      completed_at = COALESCE(?, completed_at)
    WHERE id = ?
  `, [
    input.title || null,
    input.description || null,
    input.status || null,
    input.priority ?? null,
    input.dueDate ? toISOString(input.dueDate) : null,
    input.tags ? JSON.stringify(input.tags) : null,
    now,
    completedAt,
    id,
  ]);

  const task = await getTaskById(db, id);
  if (!task) throw new Error('Failed to update task');
  return task;
}

export async function deleteTask(db: DatabaseService, id: string): Promise<void> {
  await db.run('DELETE FROM tasks WHERE id = ?', [id]);
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
    WHERE due_date < date('now')
      AND status NOT IN ('done', 'abandoned')
    ORDER BY due_date ASC
  `);
  return rows.map(rowToTask);
}
