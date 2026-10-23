import { format, isValid } from 'date-fns';

/** Parse "HH:mm" or "HH:mm:ss" into hours/minutes. Returns null for anything else. */
export function parseTimeParts(time: string | null | undefined): { h: number; m: number; s: number } | null {
  if (!time) return null;
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(time.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  const s = Number(match[3] ?? 0);
  if (h > 24 || m > 59 || s > 59) return null;
  return { h, m, s };
}

/** Combine a calendar date with a DB time value into a real local Date. */
export function combineDateAndTime(date: Date, time: string): Date | null {
  const parts = parseTimeParts(time);
  if (!parts || !isValid(date)) return null;
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), parts.h, parts.m, parts.s, 0);
  return isValid(d) ? d : null;
}

/** "yyyy-MM-dd" → local midnight Date (never via the UTC string parser). */
export function parseDateKey(key: string | null | undefined): Date | null {
  if (!key) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(key);
  if (!match) return null;
  const d = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return isValid(d) ? d : null;
}

/** Date → Supabase `date` value. */
export function toDateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/** Date → Supabase `time` value. */
export function toTimeValue(date: Date): string {
  return format(date, 'HH:mm:ss');
}

/** Safe formatter: only ever formats real, valid Date objects. */
export function safeFormat(date: Date | null | undefined, pattern: string, fallback = '—'): string {
  if (!(date instanceof Date) || !isValid(date)) return fallback;
  return format(date, pattern);
}

/** Format a DB time like "14:30:00" as "2:30 PM". */
export function formatTimeValue(time: string | null | undefined, pattern = 'h:mm a'): string {
  const d = time ? combineDateAndTime(new Date(2000, 0, 1), time) : null;
  return safeFormat(d, pattern);
}

/** Format a DB date like "2026-10-23" with a date-fns pattern. */
export function formatDateKey(key: string | null | undefined, pattern = 'EEE, MMM d'): string {
  return safeFormat(parseDateKey(key), pattern);
}

/** "HH:mm:ss" → "HH:mm" for <input type="time">. */
export function toInputTime(time: string | null | undefined): string {
  const parts = parseTimeParts(time);
  if (!parts) return '';
  return `${String(parts.h).padStart(2, '0')}:${String(parts.m).padStart(2, '0')}`;
}

/** "HH:mm" from an input → "HH:mm:ss" for Supabase. */
export function fromInputTime(value: string): string {
  const parts = parseTimeParts(value);
  if (!parts) return '';
  return `${String(parts.h).padStart(2, '0')}:${String(parts.m).padStart(2, '0')}:00`;
}

export function minutesOf(time: string): number {
  const p = parseTimeParts(time);
  return p ? p.h * 60 + p.m : 0;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} hr ${m} min` : `${h} hr`;
}

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2, minimumFractionDigits: 0 });

export function formatPrice(price: number | string | null | undefined): string {
  const n = Number(price);
  return Number.isFinite(n) ? currency.format(n) : '—';
}

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
