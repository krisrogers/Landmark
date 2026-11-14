import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import { BaseDatabaseService, QueryResult } from '../DatabaseService';
import { migrations } from '../migrations';
import {
  createTask,
  completeTask,
  snoozeTask,
  dismissReminder,
  getDueTasks,
  getTasksBySubject,
  getTaskById,
  createAsset,
  getAllAssets,
} from '../queries';
import { addMonths, addDays } from 'date-fns';

let SQL: Awaited<ReturnType<typeof initSqlJs>>;

beforeAll(async () => {
  const wasmBinary = fs.readFileSync(
    path.resolve(process.cwd(), 'node_modules/sql.js/dist/sql-wasm.wasm')
  );
  // sql.js accepts `wasmBinary` at runtime but its types omit it.
  SQL = await initSqlJs({ wasmBinary } as unknown as Parameters<typeof initSqlJs>[0]);
});

/** Minimal DatabaseService backed by an in-memory sql.js database, for tests. */
class MemDatabase extends BaseDatabaseService {
  constructor(private db: SqlJsDatabase) {
    super();
    this.initialized = true;
  }
  async initialize(): Promise<void> {}
  async execute(sql: string, params?: unknown[]): Promise<QueryResult> {
    const res = this.db.exec(sql, params as never);
    if (res.length === 0) return { columns: [], values: [] };
    return { columns: res[0].columns, values: res[0].values as unknown[][] };
  }
  async run(sql: string, params?: unknown[]): Promise<void> {
    this.db.run(sql, params as never);
  }
  async exportDatabase(): Promise<Uint8Array> {
    return this.db.export();
  }
  async importDatabase(): Promise<void> {}
  async close(): Promise<void> {
    this.db.close();
  }
}

function freshDb(applyMigrations = migrations.length): MemDatabase {
  const raw = new SQL.Database();
  for (let i = 0; i < applyMigrations; i++) {
    raw.run(migrations[i].up);
  }
  return new MemDatabase(raw);
}

describe('migration 002 — tasks V2 upgrade', () => {
  it('backfills existing v1 tasks with a place subject and reminder date', async () => {
    // Apply v1 only, seed a feature + a task in the old shape, then apply v2.
    const raw = new SQL.Database();
    raw.run(migrations[0].up);
    raw.run(
      `INSERT INTO features (id, name, geometry_type, geometry) VALUES ('f1', 'North Fence', 'LineString', '{}')`
    );
    raw.run(
      `INSERT INTO tasks (id, feature_id, title, status, due_date) VALUES ('t1', 'f1', 'Repair fence', 'planned', '2026-11-20T00:00:00.000Z')`
    );
    raw.run(migrations[1].up);

    const db = new MemDatabase(raw);
    const task = await getTaskById(db, 't1');

    expect(task).not.toBeNull();
    expect(task!.subjectType).toBe('place');
    expect(task!.subjectId).toBe('f1');
    expect(task!.featureId).toBe('f1');
    // reminder_date is backfilled from due_date
    expect(task!.reminderDate?.toISOString()).toBe('2026-11-20T00:00:00.000Z');
  });

  it('creates the assets table', async () => {
    const db = freshDb();
    const asset = await createAsset(db, { name: 'Tractor', category: 'equipment', tags: ['diesel'] });
    const all = await getAllAssets(db);
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe(asset.id);
    expect(all[0].name).toBe('Tractor');
    expect(all[0].tags).toEqual(['diesel']);
  });
});

describe('tasks V2 — subjects, reminders, recurrence', () => {
  it('attaches a task to an asset subject', async () => {
    const db = freshDb();
    const asset = await createAsset(db, { name: 'Tractor' });
    await createTask(db, {
      subjectType: 'asset',
      subjectId: asset.id,
      title: 'Service tractor',
      reminderDate: new Date('2026-08-26T00:00:00.000Z'),
    });

    const tasks = await getTasksBySubject(db, 'asset', asset.id);
    expect(tasks).toHaveLength(1);
    expect(tasks[0].subjectType).toBe('asset');
    expect(tasks[0].featureId).toBeUndefined();
  });

  it('completing a recurring task spawns the next occurrence with the reminder advanced', async () => {
    const db = freshDb();
    const base = new Date('2026-08-26T00:00:00.000Z');
    const original = await createTask(db, {
      title: 'Annual service',
      reminderDate: base,
      recurrenceInterval: 12,
      recurrenceUnit: 'months',
    });

    await completeTask(db, original.id);

    const completed = await getTaskById(db, original.id);
    expect(completed!.status).toBe('done');
    expect(completed!.completedAt).toBeDefined();

    // A fresh open occurrence should exist with the reminder one interval later.
    const due = await getDueTasks(db);
    expect(due).toHaveLength(1);
    expect(due[0].id).not.toBe(original.id);
    expect(due[0].status).toBe('planned');
    expect(due[0].reminderDate?.toISOString()).toBe(addMonths(base, 12).toISOString());
    expect(due[0].recurrenceInterval).toBe(12);
  });

  it('completing a non-recurring task does not spawn anything', async () => {
    const db = freshDb();
    const t = await createTask(db, { title: 'One-off job', reminderDate: new Date() });
    await completeTask(db, t.id);
    const due = await getDueTasks(db);
    expect(due).toHaveLength(0);
  });

  it('snooze pushes the effective reminder out; dismiss clears it', async () => {
    const db = freshDb();
    const soon = addDays(new Date(), 1);
    const t = await createTask(db, { title: 'Check trees', reminderDate: soon });

    const later = addDays(new Date(), 10);
    await snoozeTask(db, t.id, later);
    const snoozed = await getTaskById(db, t.id);
    expect(snoozed!.snoozedUntil?.toISOString()).toBe(later.toISOString());
    // Still surfaced in the due list (ordered by effective date), just later.
    expect(await getDueTasks(db)).toHaveLength(1);

    await dismissReminder(db, t.id);
    const dismissed = await getTaskById(db, t.id);
    expect(dismissed!.reminderDate).toBeUndefined();
    expect(dismissed!.snoozedUntil).toBeUndefined();
    // No reminder anymore → drops out of the due list.
    expect(await getDueTasks(db)).toHaveLength(0);
  });

  it('getDueTasks excludes done and abandoned tasks', async () => {
    const db = freshDb();
    await createTask(db, { title: 'Open', reminderDate: new Date(), status: 'planned' });
    await createTask(db, { title: 'Done', reminderDate: new Date(), status: 'done' });
    await createTask(db, { title: 'Abandoned', reminderDate: new Date(), status: 'abandoned' });
    const due = await getDueTasks(db);
    expect(due.map((t) => t.title)).toEqual(['Open']);
  });
});
