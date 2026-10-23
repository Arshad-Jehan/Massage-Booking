-- Read-only: shows what already exists in your database. Safe to run any time.
-- Run each query and compare with supabase/schema.sql.

-- 1. Tables and approximate row counts
select relname as table_name, n_live_tup as approx_rows
from pg_stat_user_tables
where schemaname = 'public'
order by relname;

-- 2. Columns and types of the app's tables
select table_name, column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in ('services','appointments','business_hours','blocked_dates','business_settings',
                     'admin_users','masseuses','masseuse_availability','appointment_masseuses')
order by table_name, ordinal_position;

-- 3. Row-level security policies (extra permissive policies can expose client details)
select tablename, policyname, cmd, roles, qual
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
