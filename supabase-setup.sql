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
