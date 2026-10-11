-- Feedback / bug reports submitted from the app.
--
-- Writes go through the server route `/api/feedback`, which uses the Supabase
-- service role key (bypassing RLS). RLS is enabled with NO policies so the
-- public anon key can never read or write this table; read submissions from the
-- Supabase dashboard (Table Editor) or via the service role.

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  type text not null check (type in ('bug', 'feature', 'other')),
  message text not null,
  contact text,
  status text not null default 'new' check (status in ('new', 'in_progress', 'done')),
  created_at timestamptz not null default now()
);

-- Locked down: RLS on, no policies => no anon/authenticated access.
alter table public.feedback enable row level security;

create index if not exists feedback_created_at_idx
  on public.feedback (created_at desc);

-- Verify: rowsecurity must be true.
--   select relname, relrowsecurity from pg_class where relname = 'feedback';
