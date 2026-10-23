import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { addDays, startOfDay } from 'date-fns';
import {
  errorMessage,
  fetchBlockedDates,
  fetchBookedRanges,
  fetchBusinessHours,
  fetchMasseuseAvailability,
  fetchMasseuses,
  fetchServices,
  fetchSettings,
} from '../../lib/api';
import { BOOKING_WINDOW_DAYS } from '../../lib/availability';
import { isSupabaseConfigured } from '../../lib/supabase';
import { toDateKey } from '../../lib/time';
import type { BlockedDate, BookedRange, BusinessHours, BusinessSettings, Masseuse, MasseuseAvailability, Service } from '../../lib/types';
import { FALLBACK_BRAND } from '../../config/images';

interface PublicData {
  loading: boolean;
  error: string | null;
  /** Availability (booked times / masseuse schedules) failed to load; the menu can still show. */
  bookingError: string | null;
  services: Service[];
  settings: BusinessSettings | null;
  hours: BusinessHours[];
  blockedDates: BlockedDate[];
  masseuses: Masseuse[];
  masseuseAvailability: MasseuseAvailability[];
  booked: BookedRange[];
  brandName: string;
  refreshAvailability: () => Promise<void>;
  reload: () => Promise<void>;
}

const Ctx = createContext<PublicData | null>(null);

/** Turn setup problems into actionable messages (detailed in dev, calm in production). */
function describeError(err: unknown, fallback: string): string {
  const raw = errorMessage(err, fallback);
  if (!import.meta.env.DEV) return fallback;
  if (!isSupabaseConfigured) return 'Supabase isn’t connected: add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local, then restart the dev server.';
  if (/schema cache|does not exist|could not find the (table|function)/i.test(raw)) return `Database not set up: run supabase/schema.sql in the Supabase SQL editor. (${raw})`;
  if (/failed to fetch|networkerror|load failed/i.test(raw)) return `Can’t reach Supabase at ${import.meta.env.VITE_SUPABASE_URL}. Check the URL in .env.local. (${raw})`;
  if (/invalid api key|jwt|apikey/i.test(raw)) return `Supabase rejected the anon key — check VITE_SUPABASE_ANON_KEY in .env.local. (${raw})`;
  return raw;
}

function windowKeys() {
  const today = startOfDay(new Date());
  return { from: toDateKey(today), to: toDateKey(addDays(today, BOOKING_WINDOW_DAYS)) };
}

export function PublicDataProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [hours, setHours] = useState<BusinessHours[]>([]);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [masseuses, setMasseuses] = useState<Masseuse[]>([]);
  const [masseuseAvailability, setMasseuseAvailability] = useState<MasseuseAvailability[]>([]);
  const [booked, setBooked] = useState<BookedRange[]>([]);

  const refreshAvailability = useCallback(async () => {
    const { from, to } = windowKeys();
    try {
      const [b, av, blocked] = await Promise.all([fetchBookedRanges(from, to), fetchMasseuseAvailability(from, to), fetchBlockedDates(from)]);
      setBooked(b);
      setMasseuseAvailability(av);
      setBlockedDates(blocked);
      setBookingError(null);
    } catch (err) {
      setBookingError(describeError(err, 'Online booking is temporarily unavailable. Please call the studio to book.'));
    }
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    if (!isSupabaseConfigured) {
      setError(describeError(null, 'Online booking is temporarily unavailable. Please call the studio to book.'));
      setLoading(false);
      return;
    }
    try {
      const { from } = windowKeys();
      const [svc, set, hrs, blocked, staff] = await Promise.all([
        fetchServices({ activeOnly: true }),
        fetchSettings(),
        fetchBusinessHours(),
        fetchBlockedDates(from),
        fetchMasseuses({ activeOnly: true }).catch(() => []),
      ]);
      setServices(svc);
      setSettings(set);
      setHours(hrs);
      setBlockedDates(blocked);
      setMasseuses(staff);
      await refreshAvailability();
    } catch (err) {
      setError(describeError(err, 'We could not load studio information right now. Please try again shortly.'));
    } finally {
      setLoading(false);
    }
  }, [refreshAvailability]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    const name = settings?.business_name?.trim();
    if (name) document.title = `${name} — Massage Therapy & Wellness Care`;
  }, [settings?.business_name]);

  const value = useMemo<PublicData>(
    () => ({
      loading,
      error,
      bookingError,
      services,
      settings,
      hours,
      blockedDates,
      masseuses,
      masseuseAvailability,
      booked,
      brandName: settings?.business_name?.trim() || FALLBACK_BRAND,
      refreshAvailability,
      reload,
    }),
    [loading, error, bookingError, services, settings, hours, blockedDates, masseuses, masseuseAvailability, booked, refreshAvailability, reload],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePublicData(): PublicData {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('usePublicData must be used inside PublicDataProvider');
  return ctx;
}
