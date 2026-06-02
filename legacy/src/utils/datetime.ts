import { format, formatDistanceToNow, parseISO, isValid } from 'date-fns';

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'yyyy-MM-dd');
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'yyyy-MM-dd HH:mm');
}

export function formatRelative(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}

export function toISOString(date: Date): string {
  return date.toISOString();
}

export function fromISOString(str: string): Date {
  return parseISO(str);
}

export function isValidDate(date: unknown): date is Date {
  return date instanceof Date && isValid(date);
}

export function now(): Date {
  return new Date();
}
