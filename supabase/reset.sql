-- ⚠️  DESTRUCTIVE: deletes the app's tables AND ALL THEIR DATA
--     (services, appointments, hours, blocked dates, settings, admin users, masseuses).
--
-- Only use this if tables were created by an earlier setup with a different structure
-- and you don't need to keep what's in them. Run supabase/check.sql first if unsure.
--
-- After running this, run supabase/schema.sql, then add your admin user again:
--   insert into public.admin_users (user_id) select id from auth.users where email = 'you@example.com';

drop function if exists public.create_booking(text, text, uuid, date, time, text, uuid);
drop function if exists public.get_booked_ranges(date, date);

drop table if exists public.appointment_masseuses cascade;
drop table if exists public.masseuse_availability cascade;
drop table if exists public.masseuses cascade;
drop table if exists public.appointments cascade;
drop table if exists public.services cascade;
drop table if exists public.business_hours cascade;
drop table if exists public.blocked_dates cascade;
drop table if exists public.business_settings cascade;
drop table if exists public.admin_users cascade;

drop function if exists public.is_admin();
