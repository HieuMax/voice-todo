-- Row Level Security for the `todos` table.
--
-- The web client talks to Supabase directly with the PUBLIC anon key, so RLS is
-- the ONLY thing preventing one user from reading or modifying another user's
-- rows. Run this once in the Supabase SQL editor (Database > SQL Editor) before
-- going to production.
--
-- WARNING: `set not null` fails if the table already contains rows with a NULL
-- user_id. Backfill them first:
--   delete from public.todos where user_id is null;   -- or assign an owner
-- (Adopt only what you need.)

-- 1. Enable RLS (no-op if already enabled).
alter table public.todos enable row level security;

-- 2. Scope inserts to the caller and force ownership on the row.
--    Requires the current user id; a NOT NULL constraint is recommended.
alter table public.todos alter column user_id set not null;
alter table public.todos alter column user_id set default auth.uid();

-- 3. Helper index for the per-user filtering done by the client.
create index if not exists todos_user_id_idx on public.todos (user_id);

-- 4. Policies: a user may only touch their own rows.
drop policy if exists "todos_select_own" on public.todos;
create policy "todos_select_own" on public.todos
  for select using (auth.uid() = user_id);

drop policy if exists "todos_insert_own" on public.todos;
create policy "todos_insert_own" on public.todos
  for insert with check (auth.uid() = user_id);

drop policy if exists "todos_update_own" on public.todos;
create policy "todos_update_own" on public.todos
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "todos_delete_own" on public.todos;
create policy "todos_delete_own" on public.todos
  for delete using (auth.uid() = user_id);

-- 5. Verify: every row above must show rowsecurity = true.
--   select relname, relrowsecurity from pg_class where relname = 'todos';
