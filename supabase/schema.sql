-- AstroJournal Supabase schema
-- Run this once in the Supabase SQL editor (Project → SQL Editor → New query → paste → Run).

-- ─── Tables ───────────────────────────────────────────────────────────

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.charts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.journal_entries (
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_key text not null,
  body text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, entry_key)
);

create table if not exists public.settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- ─── Row-Level Security ───────────────────────────────────────────────

alter table public.profiles        enable row level security;
alter table public.charts          enable row level security;
alter table public.journal_entries enable row level security;
alter table public.settings        enable row level security;

drop policy if exists "profiles self"        on public.profiles;
drop policy if exists "charts self"          on public.charts;
drop policy if exists "journal_entries self" on public.journal_entries;
drop policy if exists "settings self"        on public.settings;

create policy "profiles self" on public.profiles
  for all using (auth.uid() = id)      with check (auth.uid() = id);

create policy "charts self" on public.charts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "journal_entries self" on public.journal_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "settings self" on public.settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── Auto-create profile on signup ────────────────────────────────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
