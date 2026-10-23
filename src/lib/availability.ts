import { addDays, addMinutes, isBefore, startOfDay } from 'date-fns';
import type { BlockedDate, BookedRange, BusinessHours, BusinessSettings, Masseuse, MasseuseAvailability, Service } from './types';
import { combineDateAndTime, parseDateKey, safeFormat, toDateKey } from './time';

/** A normalized bookable slot. */
export interface Slot {
  start: Date;
  end: Date;
  label: string;
}

/** A slot plus the masseuses who could take it. */
export interface StaffedSlot extends Slot {
  masseuseIds: string[];
}

export interface AvailabilityContext {
  hours: BusinessHours[];
  settings: Pick<BusinessSettings, 'slot_interval_minutes' | 'booking_notice_hours'> | null;
  blockedDates: BlockedDate[];
  booked: BookedRange[];
  masseuses: Masseuse[];
  masseuseAvailability: MasseuseAvailability[];
  now?: Date;
}

export const BOOKING_WINDOW_DAYS = 60;
const DEFAULT_INTERVAL = 30;

interface Range {
  start: Date;
  end: Date;
  masseuseId: string | null;
}

/** Overlap rule: new_start < existing_end AND new_end > existing_start */
export function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && aEnd > bStart;
}

function toRanges(day: Date, rows: BookedRange[]): Range[] {
  const key = toDateKey(day);
  const ranges: Range[] = [];
  for (const row of rows) {
    if (row.appointment_date !== key) continue;
    const start = combineDateAndTime(day, row.start_time);
    const end = combineDateAndTime(day, row.end_time);
    if (start && end) ranges.push({ start, end, masseuseId: row.masseuse_id });
  }
  return ranges;
}

export function isDateBlocked(day: Date, blockedDates: BlockedDate[]): BlockedDate | undefined {
  const key = toDateKey(day);
  return blockedDates.find((b) => b.blocked_date === key);
}

/** Generate every available slot for a service on a given day. */
export function generateSlots(day: Date, service: Pick<Service, 'duration_minutes'>, ctx: AvailabilityContext): StaffedSlot[] {
  const date = startOfDay(day);
  const now = ctx.now ?? new Date();

  if (isDateBlocked(date, ctx.blockedDates)) return [];

  const hours = ctx.hours.find((h) => h.weekday === date.getDay());
  if (!hours || !hours.is_open) return [];

  const open = combineDateAndTime(date, hours.start_time);
  const close = combineDateAndTime(date, hours.end_time);
  if (!open || !close || !isBefore(open, close)) return [];

  const duration = Math.max(5, Number(service.duration_minutes) || 0);
  const interval = Math.max(5, Number(ctx.settings?.slot_interval_minutes) || DEFAULT_INTERVAL);
  const noticeHours = Math.max(0, Number(ctx.settings?.booking_notice_hours) || 0);
  const earliest = addMinutes(now, noticeHours * 60);

  const booked = toRanges(date, ctx.booked);
  const staff = ctx.masseuses.filter((m) => m.is_active);
  const dayKey = toDateKey(date);
  const windows = ctx.masseuseAvailability
    .filter((a) => a.available_date === dayKey)
    .map((a) => ({ masseuseId: a.masseuse_id, start: combineDateAndTime(date, a.start_time), end: combineDateAndTime(date, a.end_time) }));

  const slots: StaffedSlot[] = [];

  for (let start = open; !isBefore(close, addMinutes(start, duration)); start = addMinutes(start, interval)) {
    const end = addMinutes(start, duration);
    if (isBefore(start, earliest)) continue;

    const clashing = booked.filter((b) => overlaps(start, end, b.start, b.end));

    if (staff.length === 0) {
      // No team configured: the studio takes one session at a time.
      if (clashing.length > 0) continue;
      slots.push({ start, end, label: safeFormat(start, 'h:mm a'), masseuseIds: [] });
      continue;
    }

    const free = staff.filter((m) => {
      const works = windows.some((w) => w.masseuseId === m.id && w.start && w.end && w.start <= start && w.end >= end);
      if (!works) return false;
      return !clashing.some((b) => b.masseuseId === m.id);
    });
    const unassigned = clashing.filter((b) => !b.masseuseId).length;
    if (free.length - unassigned <= 0) continue;

    slots.push({ start, end, label: safeFormat(start, 'h:mm a'), masseuseIds: free.map((m) => m.id) });
  }

  return slots;
}

export interface DayAvailability {
  date: Date;
  key: string;
  status: 'available' | 'closed' | 'blocked' | 'full' | 'past';
  slotCount: number;
  reason?: string | null;
}

/** Summarize bookability for each day in the booking window. */
export function buildCalendar(service: Pick<Service, 'duration_minutes'> | null, ctx: AvailabilityContext): DayAvailability[] {
  const today = startOfDay(ctx.now ?? new Date());
  const days: DayAvailability[] = [];
  for (let i = 0; i < BOOKING_WINDOW_DAYS; i++) {
    const date = addDays(today, i);
    const key = toDateKey(date);
    const blocked = isDateBlocked(date, ctx.blockedDates);
    if (blocked) {
      days.push({ date, key, status: 'blocked', slotCount: 0, reason: blocked.reason });
      continue;
    }
    const hours = ctx.hours.find((h) => h.weekday === date.getDay());
    if (!hours || !hours.is_open) {
      days.push({ date, key, status: 'closed', slotCount: 0 });
      continue;
    }
    const count = service ? generateSlots(date, service, ctx).length : 0;
    days.push({ date, key, status: count > 0 ? 'available' : 'full', slotCount: count });
  }
  return days;
}

export function dateKeyToDate(key: string): Date | null {
  return parseDateKey(key);
}
