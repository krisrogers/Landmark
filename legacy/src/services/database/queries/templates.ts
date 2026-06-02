import type { DatabaseService } from '../DatabaseService';
import type { Template, CreateTemplateInput, UpdateTemplateInput, TemplateSchema } from '@/types';
import { toISOString, fromISOString } from '@/utils/datetime';

interface TemplateRow {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  is_builtin: number;
  schema: string;
  created_at: string;
  updated_at: string;
}

function rowToTemplate(row: TemplateRow): Template {
  return {
    id: row.id,
    name: row.name,
    description: row.description || undefined,
    icon: row.icon || undefined,
    isBuiltin: row.is_builtin === 1,
    schema: JSON.parse(row.schema) as TemplateSchema,
    createdAt: fromISOString(row.created_at),
    updatedAt: fromISOString(row.updated_at),
  };
}

export async function getAllTemplates(db: DatabaseService): Promise<Template[]> {
  const rows = await db.all<TemplateRow>(`
    SELECT * FROM templates
    ORDER BY is_builtin DESC, name ASC
  `);
  return rows.map(rowToTemplate);
}

export async function getTemplateById(
  db: DatabaseService,
  id: string
): Promise<Template | null> {
  const row = await db.get<TemplateRow>('SELECT * FROM templates WHERE id = ?', [id]);
  return row ? rowToTemplate(row) : null;
}

export async function getTemplateByName(
  db: DatabaseService,
  name: string
): Promise<Template | null> {
  const row = await db.get<TemplateRow>('SELECT * FROM templates WHERE name = ?', [name]);
  return row ? rowToTemplate(row) : null;
}

export async function createTemplate(
  db: DatabaseService,
  input: CreateTemplateInput,
  isBuiltin = false
): Promise<Template> {
  const now = toISOString(new Date());

  await db.run(`
    INSERT INTO templates (
      id, name, description, icon, is_builtin, schema, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    input.id,
    input.name,
    input.description || null,
    input.icon || null,
    isBuiltin ? 1 : 0,
    JSON.stringify(input.schema),
    now,
    now,
  ]);

  const template = await getTemplateById(db, input.id);
  if (!template) throw new Error('Failed to create template');
  return template;
}

export async function updateTemplate(
  db: DatabaseService,
  id: string,
  input: UpdateTemplateInput
): Promise<Template> {
  const existing = await getTemplateById(db, id);
  if (!existing) throw new Error('Template not found');
  if (existing.isBuiltin) throw new Error('Cannot modify builtin template');

  const now = toISOString(new Date());

  await db.run(`
    UPDATE templates SET
      name = COALESCE(?, name),
      description = COALESCE(?, description),
      icon = COALESCE(?, icon),
      schema = COALESCE(?, schema),
      updated_at = ?
    WHERE id = ?
  `, [
    input.name || null,
    input.description || null,
    input.icon || null,
    input.schema ? JSON.stringify(input.schema) : null,
    now,
    id,
  ]);

  const template = await getTemplateById(db, id);
  if (!template) throw new Error('Failed to update template');
  return template;
}

export async function deleteTemplate(db: DatabaseService, id: string): Promise<void> {
  const existing = await getTemplateById(db, id);
  if (!existing) throw new Error('Template not found');
  if (existing.isBuiltin) throw new Error('Cannot delete builtin template');

  await db.run('DELETE FROM templates WHERE id = ?', [id]);
}

export async function getTemplateCount(db: DatabaseService): Promise<number> {
  const result = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM templates');
  return result?.count || 0;
}

export async function resetBuiltinTemplates(db: DatabaseService): Promise<void> {
  await db.run('DELETE FROM templates WHERE is_builtin = 1');
}
