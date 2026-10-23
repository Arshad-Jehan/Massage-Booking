-- =====================================================================
-- Massage Therapy Booking Platform — Supabase schema
-- Run this whole file once in the Supabase SQL editor.
-- It is idempotent: safe to run again after changes.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Safety check: tables left over from an earlier setup must use uuid ids.
-- ---------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select c.table_name, c.data_type
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.column_name = 'id'
      and c.table_name in ('services','appointments','business_hours','blocked_dates','business_settings',
                           'admin_users','masseuses','masseuse_availability')
      and c.data_type <> 'uuid'
  loop
    raise exception 'Existing table public.% has an id of type % (this app needs uuid). It was created by an earlier setup. Run supabase/check.sql to review it, then supabase/reset.sql to rebuild, then this file again.', r.table_name, r.data_type;
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Core tables (exact schema)
-- ---------------------------------------------------------------------

create table if not exists public.services (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  description      text,
  duration_minutes integer not null check (duration_minutes > 0 and duration_minutes <= 480),
  price            numeric(10,2) not null default 0 check (price >= 0),
  is_active        boolean not null default true,
  created_at       timestamptz not null default now()
);

create table if not exists public.appointments (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  phone            text not null,
  service_id       uuid not null references public.services(id) on delete restrict,
  appointment_date date not null,
  start_time       time not null,
  end_time         time not null,
  status           text not null default 'pending'
                   check (status in ('pending','confirmed','cancelled','completed')),
  notes            text,
  created_at       timestamptz not null default now(),
  check (end_time > start_time)
);
create index if not exists appointments_date_idx on public.appointments (appointment_date);

create table if not exists public.business_hours (
  id         uuid primary key default gen_random_uuid(),
  weekday    smallint not null unique check (weekday between 0 and 6), -- 0 = Sunday … 6 = Saturday
  is_open    boolean not null default true,
  start_time time not null default '09:00',
  end_time   time not null default '18:00',
  check (end_time > start_time)
);

create table if not exists public.blocked_dates (
  id           uuid primary key default gen_random_uuid(),
  blocked_date date not null unique,
  reason       text,
  created_at   timestamptz not null default now()
);

create table if not exists public.business_settings (
  id                    uuid primary key default gen_random_uuid(),
  business_name         text not null,
  business_phone        text,
  business_address      text,
  slot_interval_minutes integer not null default 30 check (slot_interval_minutes between 5 and 240),
  booking_notice_hours  integer not null default 2 check (booking_notice_hours between 0 and 720),
  created_at            timestamptz not null default now()
);

create table if not exists public.admin_users (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null unique references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Masseuse tables (additive — the core tables above are untouched)
-- ---------------------------------------------------------------------

create table if not exists public.masseuses (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  title       text,
  bio         text,
  specialties text,
  photo_url   text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Date-specific working windows for each masseuse.
create table if not exists public.masseuse_availability (
  id             uuid primary key default gen_random_uuid(),
  masseuse_id    uuid not null references public.masseuses(id) on delete cascade,
  available_date date not null,
  start_time     time not null,
  end_time       time not null,
  created_at     timestamptz not null default now(),
  check (end_time > start_time)
);
create index if not exists masseuse_availability_date_idx on public.masseuse_availability (available_date);

-- Links an appointment to the masseuse who will perform it.
create table if not exists public.appointment_masseuses (
  appointment_id uuid primary key references public.appointments(id) on delete cascade,
  masseuse_id    uuid not null references public.masseuses(id) on delete restrict,
  created_at     timestamptz not null default now()
);
create index if not exists appointment_masseuses_masseuse_idx on public.appointment_masseuses (masseuse_id);

-- ---------------------------------------------------------------------
-- Upgrade tables that already existed before this script was run
-- (e.g. created by an earlier setup). Adds any missing columns; never drops data.
-- ---------------------------------------------------------------------

alter table public.services
  add column if not exists name             text,
  add column if not exists description      text,
  add column if not exists duration_minutes integer default 60,
  add column if not exists price            numeric(10,2) default 0,
  add column if not exists is_active        boolean default true,
  add column if not exists created_at       timestamptz default now();

alter table public.appointments
  add column if not exists name             text,
  add column if not exists phone            text,
  add column if not exists service_id       uuid,
  add column if not exists appointment_date date,
  add column if not exists start_time       time,
  add column if not exists end_time         time,
  add column if not exists status           text default 'pending',
  add column if not exists notes            text,
  add column if not exists created_at       timestamptz default now();

alter table public.business_hours
  add column if not exists weekday    smallint,
  add column if not exists is_open    boolean default true,
  add column if not exists start_time time default '09:00',
  add column if not exists end_time   time default '18:00';

alter table public.blocked_dates
  add column if not exists blocked_date date,
  add column if not exists reason       text,
  add column if not exists created_at   timestamptz default now();

alter table public.business_settings
  add column if not exists business_name         text,
  add column if not exists business_phone        text,
  add column if not exists business_address      text,
  add column if not exists slot_interval_minutes integer default 30,
  add column if not exists booking_notice_hours  integer default 2,
  add column if not exists created_at            timestamptz default now();

alter table public.admin_users
  add column if not exists user_id    uuid,
  add column if not exists created_at timestamptz default now();

-- business_hours needs one row per weekday for the defaults below.
create unique index if not exists business_hours_weekday_key on public.business_hours (weekday);

-- ---------------------------------------------------------------------
-- Admin check — access is controlled ONLY by admin_users.user_id
-- ---------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;

grant execute on function public.is_admin() to anon, authenticated;

-- ---------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------

alter table public.services              enable row level security;
alter table public.appointments          enable row level security;
alter table public.business_hours        enable row level security;
alter table public.blocked_dates         enable row level security;
alter table public.business_settings     enable row level security;
alter table public.admin_users           enable row level security;
alter table public.masseuses             enable row level security;
alter table public.masseuse_availability enable row level security;
alter table public.appointment_masseuses enable row level security;

-- services: public sees active ones, admins see and manage everything
drop policy if exists "services public read" on public.services;
create policy "services public read" on public.services
  for select using (is_active or public.is_admin());
drop policy if exists "services admin write" on public.services;
create policy "services admin write" on public.services
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- appointments: admin only. Public booking goes through create_booking().
drop policy if exists "appointments admin all" on public.appointments;
create policy "appointments admin all" on public.appointments
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- business_hours / blocked_dates / business_settings: public read, admin write
drop policy if exists "hours public read" on public.business_hours;
create policy "hours public read" on public.business_hours for select using (true);
drop policy if exists "hours admin write" on public.business_hours;
create policy "hours admin write" on public.business_hours
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "blocked public read" on public.blocked_dates;
create policy "blocked public read" on public.blocked_dates for select using (true);
drop policy if exists "blocked admin write" on public.blocked_dates;
create policy "blocked admin write" on public.blocked_dates
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "settings public read" on public.business_settings;
create policy "settings public read" on public.business_settings for select using (true);
drop policy if exists "settings admin write" on public.business_settings;
create policy "settings admin write" on public.business_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- admin_users: a signed-in user may only see their own row. Rows are added in the SQL editor.
drop policy if exists "admin_users self read" on public.admin_users;
create policy "admin_users self read" on public.admin_users
  for select to authenticated using (user_id = auth.uid());

-- masseuses: public sees active ones, admin manages
drop policy if exists "masseuses public read" on public.masseuses;
create policy "masseuses public read" on public.masseuses
  for select using (is_active or public.is_admin());
drop policy if exists "masseuses admin write" on public.masseuses;
create policy "masseuses admin write" on public.masseuses
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "availability public read" on public.masseuse_availability;
create policy "availability public read" on public.masseuse_availability for select using (true);
drop policy if exists "availability admin write" on public.masseuse_availability;
create policy "availability admin write" on public.masseuse_availability
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "appointment_masseuses admin all" on public.appointment_masseuses;
create policy "appointment_masseuses admin all" on public.appointment_masseuses
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- Public availability: booked time ranges only (no client names/phones)
-- ---------------------------------------------------------------------

create or replace function public.get_booked_ranges(p_from date, p_to date)
returns table (appointment_date date, start_time time, end_time time, masseuse_id uuid)
language sql
stable
security definer
set search_path = public
as $$
  select a.appointment_date, a.start_time, a.end_time, am.masseuse_id
  from public.appointments a
  left join public.appointment_masseuses am on am.appointment_id = a.id
  where a.status <> 'cancelled'
    and a.appointment_date between p_from and least(p_to, p_from + 180);
$$;

grant execute on function public.get_booked_ranges(date, date) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Public booking: validates the slot server-side, then inserts atomically
-- ---------------------------------------------------------------------

create or replace function public.create_booking(
  p_name             text,
  p_phone            text,
  p_service_id       uuid,
  p_appointment_date date,
  p_start_time       time,
  p_notes            text default null,
  p_masseuse_id      uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_service     public.services%rowtype;
  v_hours       public.business_hours%rowtype;
  v_end         time;
  v_has_staff   boolean;
  v_unassigned  integer;
  v_free_total  integer;
  v_chosen      uuid;
  v_chosen_name text;
  v_id          uuid;
begin
  if coalesce(btrim(p_name), '') = '' or coalesce(btrim(p_phone), '') = '' then
    raise exception 'Please provide your name and phone number.';
  end if;

  select * into v_service from public.services where id = p_service_id and is_active;
  if not found then
    raise exception 'This service is no longer available.';
  end if;

  v_end := p_start_time + make_interval(mins => v_service.duration_minutes);
  if v_end <= p_start_time then
    raise exception 'This session would run past closing time.';
  end if;

  if p_appointment_date < current_date - 1 then
    raise exception 'Please choose an upcoming date.';
  end if;

  if exists (select 1 from public.blocked_dates where blocked_date = p_appointment_date) then
    raise exception 'The studio is closed on this date.';
  end if;

  select * into v_hours from public.business_hours
  where weekday = extract(dow from p_appointment_date)::int;
  if not found or not v_hours.is_open
     or p_start_time < v_hours.start_time or v_end > v_hours.end_time then
    raise exception 'This time is outside our opening hours.';
  end if;

  -- Serialise bookings for the same day so two clients cannot take one slot.
  perform pg_advisory_xact_lock(hashtext('booking:' || p_appointment_date::text));

  select exists (select 1 from public.masseuses where is_active) into v_has_staff;

  if v_has_staff then
    select count(*) into v_unassigned
    from public.appointments a
    where a.appointment_date = p_appointment_date
      and a.status <> 'cancelled'
      and p_start_time < a.end_time and v_end > a.start_time
      and not exists (select 1 from public.appointment_masseuses am where am.appointment_id = a.id);

    -- Masseuses who work this window and have no overlapping session
    with free as (
      select m.id,
             (select count(*) from public.appointment_masseuses am2
                join public.appointments a2 on a2.id = am2.appointment_id
               where am2.masseuse_id = m.id
                 and a2.appointment_date = p_appointment_date
                 and a2.status <> 'cancelled') as day_load
      from public.masseuses m
      where m.is_active
        and exists (
          select 1 from public.masseuse_availability av
          where av.masseuse_id = m.id
            and av.available_date = p_appointment_date
            and av.start_time <= p_start_time
            and av.end_time >= v_end)
        and not exists (
          select 1 from public.appointment_masseuses am
          join public.appointments a on a.id = am.appointment_id
          where am.masseuse_id = m.id
            and a.appointment_date = p_appointment_date
            and a.status <> 'cancelled'
            and p_start_time < a.end_time and v_end > a.start_time)
    ),
    picked as (
      select f.id from free f
      where p_masseuse_id is null or f.id = p_masseuse_id
      order by f.day_load, random()
      limit 1
    )
    select (select count(*) from free), (select id from picked)
    into v_free_total, v_chosen;

    if v_chosen is null or v_free_total - v_unassigned <= 0 then
      raise exception 'Sorry, that time was just booked. Please choose another time.';
    end if;
  else
    if exists (
      select 1 from public.appointments a
      where a.appointment_date = p_appointment_date
        and a.status <> 'cancelled'
        and p_start_time < a.end_time and v_end > a.start_time) then
      raise exception 'Sorry, that time was just booked. Please choose another time.';
    end if;
  end if;

  insert into public.appointments (name, phone, service_id, appointment_date, start_time, end_time, status, notes)
  values (btrim(p_name), btrim(p_phone), p_service_id, p_appointment_date, p_start_time, v_end, 'pending',
          nullif(btrim(coalesce(p_notes, '')), ''))
  returning id into v_id;

  if v_chosen is not null then
    insert into public.appointment_masseuses (appointment_id, masseuse_id) values (v_id, v_chosen);
    select name into v_chosen_name from public.masseuses where id = v_chosen;
  end if;

  return jsonb_build_object(
    'id', v_id,
    'end_time', v_end,
    'masseuse_id', v_chosen,
    'masseuse_name', v_chosen_name
  );
end;
$$;

grant execute on function public.create_booking(text, text, uuid, date, time, text, uuid) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Required configuration rows (edit these later from the dashboard)
-- ---------------------------------------------------------------------

insert into public.business_hours (weekday, is_open, start_time, end_time) values
  (0, false, '10:00', '16:00'),
  (1, true,  '09:00', '19:00'),
  (2, true,  '09:00', '19:00'),
  (3, true,  '09:00', '19:00'),
  (4, true,  '09:00', '20:00'),
  (5, true,  '09:00', '20:00'),
  (6, true,  '10:00', '17:00')
on conflict (weekday) do nothing;

insert into public.business_settings (business_name, business_phone, business_address, slot_interval_minutes, booking_notice_hours)
select 'Stillwater Massage Therapy', '', '', 30, 2
where not exists (select 1 from public.business_settings);

-- ---------------------------------------------------------------------
-- Make yourself an admin (run separately, after creating the Auth user):
--
--   insert into public.admin_users (user_id)
--   select id from auth.users where email = 'you@example.com';
--
-- The app itself never checks email — only admin_users.user_id.
-- ---------------------------------------------------------------------
