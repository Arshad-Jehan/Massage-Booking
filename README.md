# Massage Therapy Booking Platform

A premium massage therapy website with real online booking and a secure studio dashboard.
React + TypeScript + Vite, backed by Supabase (Postgres, Auth, RLS).

## Setup

1. **Install**
   ```bash
   npm install
   ```

2. **Connect Supabase.** Put your project's values in `.env.local`:
   ```
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-publishable-anon-key
   ```

3. **Create the database.** In the Supabase dashboard, open **SQL Editor** and run
   [`supabase/schema.sql`](supabase/schema.sql). It creates the tables, row-level security
   policies, the booking functions, default business hours and a settings row. It is safe to re-run.

   Optional: run [`supabase/seed-services.sql`](supabase/seed-services.sql) for a starter service menu
   (only inserts if the services table is empty).

   **Tables already exist from an earlier setup?** `schema.sql` adds any missing columns to them and
   keeps your data. If it stops with an "id of type bigint" message, the old tables are incompatible:
   review them with [`supabase/check.sql`](supabase/check.sql) (read-only), then run
   [`supabase/reset.sql`](supabase/reset.sql) — **this deletes those tables and their data** — and run
   `schema.sql` again.

4. **Create your admin login.**
   - Supabase → **Authentication → Users → Add user** (email + password, auto-confirm).
   - Then in the SQL editor:
     ```sql
     insert into public.admin_users (user_id)
     select id from auth.users where email = 'you@example.com';
     ```
   The app checks access **only** by `auth.user.id` ∈ `admin_users.user_id`.

5. **Run**
   ```bash
   npm run dev        # http://localhost:5173  ·  dashboard at /admin
   npm run build      # production build in dist/
   ```
   When deploying, configure your host to serve `index.html` for all routes (SPA fallback) so `/admin` works on refresh.

## How booking works

Time slots are generated in [`src/lib/availability.ts`](src/lib/availability.ts) from:
`business_hours`, `services.duration_minutes`, `business_settings.slot_interval_minutes`,
`business_settings.booking_notice_hours`, `blocked_dates` and existing non-cancelled appointments
(overlap rule: `new_start < existing_end AND new_end > existing_start`).

Bookings are submitted through the `create_booking` database function, which re-validates the slot
server-side (opening hours, blocked dates, overlaps, masseuse availability) under a per-day lock, so
two clients can never take the same time. The public site never reads client names or phone numbers —
only booked time ranges via `get_booked_ranges`.

### Masseuses

The core schema is unchanged. Masseuses use three additional tables:

| table | purpose |
| --- | --- |
| `masseuses` | team members (name, title, specialties, bio, photo, active) |
| `masseuse_availability` | date-specific working windows per masseuse |
| `appointment_masseuses` | which masseuse an appointment is assigned to |

- **No active masseuses:** the studio takes one booking at a time within business hours, and the masseuse step is skipped.
- **With masseuses:** a time is offered only when at least one masseuse is scheduled for that window and free.
  "Any available masseuse" assigns the least-booked free therapist. Add working days from **Dashboard → Masseuses → Add availability**
  (single date or weekly repeat, optionally matching studio hours).

## Images

All imagery is defined in [`src/config/images.ts`](src/config/images.ts). Replace any URL there.
Service cards pick an image by keywords in the service name (e.g. "deep", "stone", "aroma"), with fallbacks.
Images fade in on load and degrade to a soft gradient if a URL fails.

## Project structure

```
src/
  lib/            supabase client, types, data API, time + availability logic
  config/         image URLs
  components/
    public/       navbar, hero, services, about, footer, public data provider
    booking/      booking flow, calendar, time slots, step indicator
    ui/           drawer, toggle, toast, badges, image
  admin/          auth context, route guard, login, layout, pages/
  styles/         base tokens, site, booking, admin
supabase/         schema.sql, seed-services.sql
```
