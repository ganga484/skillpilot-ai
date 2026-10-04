-- =========================================================
--  SkillPilot AI — Supabase setup
--  Run this ONCE: Supabase dashboard → SQL Editor → New query
--  → paste everything → Run.
-- =========================================================

-- Table for messages sent from the Contact page
create table if not exists public.contact_messages (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  name        text not null check (char_length(name) between 2 and 80),
  email       text not null check (char_length(email) <= 200),
  topic       text not null default 'general',
  message     text not null check (char_length(message) between 10 and 4000)
);

-- Security: visitors may ADD a message, but nobody can read,
-- change or delete messages through the website.
-- (You can still read them in the Supabase dashboard → Table Editor.)
alter table public.contact_messages enable row level security;

drop policy if exists "Anyone can send a contact message" on public.contact_messages;
create policy "Anyone can send a contact message"
  on public.contact_messages
  for insert
  to anon, authenticated
  with check (true);

grant insert on public.contact_messages to anon, authenticated;


-- =========================================================
--  Saved resumes (My Resumes page)
--  Each logged-in user can only see / change their own rows.
-- =========================================================
create table if not exists public.resumes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title       text not null default 'My resume',
  target_role text,
  content     text not null,
  created_at  timestamptz not null default now()
);

create index if not exists resumes_user_id_idx on public.resumes (user_id);

alter table public.resumes enable row level security;

drop policy if exists "Users read own resumes"   on public.resumes;
drop policy if exists "Users add own resumes"    on public.resumes;
drop policy if exists "Users update own resumes" on public.resumes;
drop policy if exists "Users delete own resumes" on public.resumes;

create policy "Users read own resumes"   on public.resumes for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users add own resumes"    on public.resumes for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users update own resumes" on public.resumes for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users delete own resumes" on public.resumes for delete to authenticated using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.resumes to authenticated;
