import { supabase } from './supabase';
import type {
  AppointmentStatus,
  AppointmentWithRelations,
  BlockedDate,
  BookedRange,
  BookingResult,
  BusinessHours,
  BusinessSettings,
  Masseuse,
  MasseuseAvailability,
  Service,
} from './types';

export function errorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (!err) return fallback;
  if (typeof err === 'string') return err;
  if (typeof err === 'object' && err && 'message' in err && typeof (err as { message: unknown }).message === 'string') {
    return (err as { message: string }).message || fallback;
  }
  return fallback;
}

function unwrap<T>(result: { data: T | null; error: unknown }): T {
  if (result.error) throw result.error;
  return result.data as T;
}

const normalizeService = (s: Service): Service => ({ ...s, price: Number(s.price), duration_minutes: Number(s.duration_minutes) });

/* ----------------------------- Shared reads ----------------------------- */

export async function fetchServices(opts: { activeOnly: boolean }): Promise<Service[]> {
  let query = supabase.from('services').select('*').order('created_at', { ascending: true });
  if (opts.activeOnly) query = query.eq('is_active', true);
  return (unwrap(await query) as Service[]).map(normalizeService);
}

export async function fetchBusinessHours(): Promise<BusinessHours[]> {
  return unwrap(await supabase.from('business_hours').select('*').order('weekday')) as BusinessHours[];
}

export async function fetchSettings(): Promise<BusinessSettings | null> {
  const { data, error } = await supabase.from('business_settings').select('*').order('created_at').limit(1).maybeSingle();
  if (error) throw error;
  return data as BusinessSettings | null;
}

export async function fetchBlockedDates(fromKey?: string): Promise<BlockedDate[]> {
  let query = supabase.from('blocked_dates').select('*').order('blocked_date');
  if (fromKey) query = query.gte('blocked_date', fromKey);
  return unwrap(await query) as BlockedDate[];
}

export async function fetchMasseuses(opts: { activeOnly: boolean }): Promise<Masseuse[]> {
  let query = supabase.from('masseuses').select('*').order('created_at');
  if (opts.activeOnly) query = query.eq('is_active', true);
  return unwrap(await query) as Masseuse[];
}

export async function fetchMasseuseAvailability(fromKey: string, toKey: string, masseuseId?: string): Promise<MasseuseAvailability[]> {
  let query = supabase
    .from('masseuse_availability')
    .select('*')
    .gte('available_date', fromKey)
    .lte('available_date', toKey)
    .order('available_date')
    .order('start_time');
  if (masseuseId) query = query.eq('masseuse_id', masseuseId);
  return unwrap(await query) as MasseuseAvailability[];
}

/* ----------------------------- Public booking ----------------------------- */

export async function fetchBookedRanges(fromKey: string, toKey: string): Promise<BookedRange[]> {
  return (unwrap(await supabase.rpc('get_booked_ranges', { p_from: fromKey, p_to: toKey })) ?? []) as BookedRange[];
}

export interface BookingInput {
  name: string;
  phone: string;
  serviceId: string;
  appointmentDate: string; // yyyy-MM-dd
  startTime: string; // HH:mm:ss
  notes: string;
  masseuseId: string | null;
}

export async function createBooking(input: BookingInput): Promise<BookingResult> {
  const data = unwrap(
    await supabase.rpc('create_booking', {
      p_name: input.name,
      p_phone: input.phone,
      p_service_id: input.serviceId,
      p_appointment_date: input.appointmentDate,
      p_start_time: input.startTime,
      p_notes: input.notes || null,
      p_masseuse_id: input.masseuseId,
    }),
  );
  return data as BookingResult;
}

/* ----------------------------- Admin ----------------------------- */

export async function checkIsAdmin(userId: string): Promise<boolean> {
  const { data, error } = await supabase.from('admin_users').select('id').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

export async function fetchAppointments(): Promise<AppointmentWithRelations[]> {
  const rows = unwrap(
    await supabase
      .from('appointments')
      .select('*, services(id, name, duration_minutes, price), appointment_masseuses(masseuse_id, masseuses(id, name))')
      .order('appointment_date', { ascending: false })
      .order('start_time', { ascending: false }),
  ) as unknown as Array<AppointmentWithRelations & { appointment_masseuses: unknown }>;
  // PostgREST may return the one-to-one link as an object or a single-item array.
  return rows.map((r) => ({
    ...r,
    appointment_masseuses: Array.isArray(r.appointment_masseuses)
      ? (r.appointment_masseuses[0] ?? null)
      : ((r.appointment_masseuses as AppointmentWithRelations['appointment_masseuses']) ?? null),
  }));
}

export async function updateAppointmentStatus(id: string, status: AppointmentStatus): Promise<void> {
  unwrap(await supabase.from('appointments').update({ status }).eq('id', id).select('id'));
}

export type ServiceInput = Pick<Service, 'name' | 'description' | 'duration_minutes' | 'price' | 'is_active'>;

export async function saveService(input: ServiceInput, id?: string): Promise<void> {
  if (id) unwrap(await supabase.from('services').update(input).eq('id', id).select('id'));
  else unwrap(await supabase.from('services').insert(input).select('id'));
}

export async function setServiceActive(id: string, is_active: boolean): Promise<void> {
  unwrap(await supabase.from('services').update({ is_active }).eq('id', id).select('id'));
}

export async function saveBusinessHours(rows: Array<Pick<BusinessHours, 'weekday' | 'is_open' | 'start_time' | 'end_time'>>): Promise<void> {
  unwrap(await supabase.from('business_hours').upsert(rows, { onConflict: 'weekday' }).select('id'));
}

export async function addBlockedDate(blocked_date: string, reason: string): Promise<void> {
  unwrap(await supabase.from('blocked_dates').insert({ blocked_date, reason: reason || null }).select('id'));
}

export async function removeBlockedDate(id: string): Promise<void> {
  unwrap(await supabase.from('blocked_dates').delete().eq('id', id));
}

export type SettingsInput = Pick<
  BusinessSettings,
  'business_name' | 'business_phone' | 'business_address' | 'slot_interval_minutes' | 'booking_notice_hours'
>;

export async function saveSettings(input: SettingsInput, id?: string): Promise<BusinessSettings> {
  const result = id
    ? await supabase.from('business_settings').update(input).eq('id', id).select('*').single()
    : await supabase.from('business_settings').insert(input).select('*').single();
  return unwrap(result) as BusinessSettings;
}

export type MasseuseInput = Pick<Masseuse, 'name' | 'title' | 'bio' | 'specialties' | 'photo_url' | 'is_active'>;

export async function saveMasseuse(input: MasseuseInput, id?: string): Promise<void> {
  if (id) unwrap(await supabase.from('masseuses').update(input).eq('id', id).select('id'));
  else unwrap(await supabase.from('masseuses').insert(input).select('id'));
}

export async function setMasseuseActive(id: string, is_active: boolean): Promise<void> {
  unwrap(await supabase.from('masseuses').update({ is_active }).eq('id', id).select('id'));
}

export async function addMasseuseAvailability(
  rows: Array<Pick<MasseuseAvailability, 'masseuse_id' | 'available_date' | 'start_time' | 'end_time'>>,
): Promise<void> {
  if (rows.length === 0) return;
  unwrap(await supabase.from('masseuse_availability').insert(rows).select('id'));
}

export async function removeMasseuseAvailability(id: string): Promise<void> {
  unwrap(await supabase.from('masseuse_availability').delete().eq('id', id));
}
