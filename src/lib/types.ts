export type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

export const APPOINTMENT_STATUSES: AppointmentStatus[] = ['pending', 'confirmed', 'completed', 'cancelled'];

export interface Service {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number;
  is_active: boolean;
  created_at: string;
}

export interface Appointment {
  id: string;
  name: string;
  phone: string;
  service_id: string;
  appointment_date: string; // yyyy-MM-dd
  start_time: string; // HH:mm:ss
  end_time: string; // HH:mm:ss
  status: AppointmentStatus;
  notes: string | null;
  created_at: string;
}

export interface AppointmentWithRelations extends Appointment {
  services: Pick<Service, 'id' | 'name' | 'duration_minutes' | 'price'> | null;
  appointment_masseuses: { masseuse_id: string; masseuses: Pick<Masseuse, 'id' | 'name'> | null } | null;
}

export interface BusinessHours {
  id: string;
  weekday: number; // 0 = Sunday … 6 = Saturday
  is_open: boolean;
  start_time: string;
  end_time: string;
}

export interface BlockedDate {
  id: string;
  blocked_date: string;
  reason: string | null;
  created_at: string;
}

export interface BusinessSettings {
  id: string;
  business_name: string;
  business_phone: string | null;
  business_address: string | null;
  slot_interval_minutes: number;
  booking_notice_hours: number;
  created_at: string;
}

export interface Masseuse {
  id: string;
  name: string;
  title: string | null;
  bio: string | null;
  specialties: string | null;
  photo_url: string | null;
  is_active: boolean;
  created_at: string;
}

export interface MasseuseAvailability {
  id: string;
  masseuse_id: string;
  available_date: string;
  start_time: string;
  end_time: string;
  created_at: string;
}

export interface BookedRange {
  appointment_date: string;
  start_time: string;
  end_time: string;
  masseuse_id: string | null;
}

export interface BookingResult {
  id: string;
  end_time: string;
  masseuse_id: string | null;
  masseuse_name: string | null;
}
