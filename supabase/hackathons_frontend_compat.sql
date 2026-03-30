-- Align existing public.hackathons table with frontend expectations in src/lib/database-sync.ts
-- Safe to run multiple times.

begin;

-- 1) Add missing columns expected by the frontend sync payload.
alter table public.hackathons
  add column if not exists slug text,
  add column if not exists theme text,
  add column if not exists duration_hours integer not null default 24,
  add column if not exists submissions integer not null default 0,
  add column if not exists evaluated integer not null default 0;

-- 2) Normalize status and timestamps defaults used by UI.
alter table public.hackathons
  alter column status set default 'live';

alter table public.hackathons
  alter column created_at set default now(),
  alter column updated_at set default now();

-- 3) Backfill slug for existing rows and guarantee uniqueness for upsert(onConflict: 'slug').
update public.hackathons
set slug = regexp_replace(lower(coalesce(name, 'hackathon')), '[^a-z0-9]+', '-', 'g') || '-' || substr(md5(id::text), 1, 6)
where slug is null or btrim(slug) = '';

-- 4) Ensure slug uniqueness and non-null for reliable upsert.
alter table public.hackathons
  alter column slug set not null;

create unique index if not exists hackathons_slug_key
  on public.hackathons (slug);

-- 5) Keep updated_at current on updates.
create or replace function public.set_hackathons_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_hackathons_updated_at on public.hackathons;
create trigger trg_hackathons_updated_at
before update on public.hackathons
for each row
execute function public.set_hackathons_updated_at();

-- 6) Allow anon + authenticated client reads/writes used by browser Supabase anon key.
alter table public.hackathons enable row level security;

drop policy if exists hackathons_read_public on public.hackathons;
create policy hackathons_read_public
on public.hackathons
for select
to anon, authenticated
using (true);

drop policy if exists hackathons_insert_public on public.hackathons;
create policy hackathons_insert_public
on public.hackathons
for insert
to anon, authenticated
with check (true);

drop policy if exists hackathons_update_public on public.hackathons;
create policy hackathons_update_public
on public.hackathons
for update
to anon, authenticated
using (true)
with check (true);

-- Grant table privileges (RLS still applies).
grant select, insert, update on table public.hackathons to anon, authenticated;

-- 7) Users table used by admin auth and system metrics.
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password text not null,
  role text not null check (role in ('developer_admin', 'hackathon_admin', 'participant')),
  team_id text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ensure team_id column exists on existing tables (migration-safe)
alter table public.users
  add column if not exists team_id text;

create index if not exists users_role_idx on public.users (role);
create unique index if not exists users_team_id_key on public.users (team_id) where team_id is not null;

create or replace function public.set_users_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_users_updated_at on public.users;
create trigger trg_users_updated_at
before update on public.users
for each row
execute function public.set_users_updated_at();

alter table public.users enable row level security;

drop policy if exists users_read_public on public.users;
create policy users_read_public
on public.users
for select
to anon, authenticated
using (true);

drop policy if exists users_insert_public on public.users;
create policy users_insert_public
on public.users
for insert
to anon, authenticated
with check (true);

drop policy if exists users_update_public on public.users;
create policy users_update_public
on public.users
for update
to anon, authenticated
using (true)
with check (true);

grant select, insert, update on table public.users to anon, authenticated;

-- 8) Submissions table powering submission page and leaderboard.
create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  hackathon_slug text not null,
  team_id text not null,
  team_name text,
  repository_url text not null,
  problem_statement text,
  status text not null default 'queued' check (status in ('queued', 'evaluated', 'rejected')),
  score numeric,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ensure required columns exist on existing tables (migration-safe)
alter table public.submissions
  add column if not exists hackathon_slug text,
  add column if not exists team_id text,
  add column if not exists team_name text,
  add column if not exists repository_url text,
  add column if not exists problem_statement text,
  add column if not exists status text,
  add column if not exists score numeric,
  add column if not exists submitted_at timestamptz,
  add column if not exists updated_at timestamptz,
  add column if not exists final_score numeric,
  add column if not exists max_total numeric,
  add column if not exists technical_score numeric,
  add column if not exists max_technical numeric,
  add column if not exists innovation_score numeric,
  add column if not exists max_innovation numeric,
  add column if not exists completeness_score numeric,
  add column if not exists max_completeness numeric,
  add column if not exists technical_breakdown jsonb,
  add column if not exists innovation_breakdown jsonb,
  add column if not exists completeness_breakdown jsonb,
  add column if not exists evaluation_timestamp timestamptz;

create index if not exists submissions_hackathon_slug_idx on public.submissions (hackathon_slug);
create index if not exists submissions_score_idx on public.submissions (score desc);
create index if not exists submissions_final_score_idx on public.submissions (final_score desc);

create or replace function public.set_submissions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_submissions_updated_at on public.submissions;
create trigger trg_submissions_updated_at
before update on public.submissions
for each row
execute function public.set_submissions_updated_at();

alter table public.submissions enable row level security;

drop policy if exists submissions_read_public on public.submissions;
create policy submissions_read_public
on public.submissions
for select
to anon, authenticated
using (true);

drop policy if exists submissions_insert_public on public.submissions;
create policy submissions_insert_public
on public.submissions
for insert
to anon, authenticated
with check (true);

drop policy if exists submissions_update_public on public.submissions;
create policy submissions_update_public
on public.submissions
for update
to anon, authenticated
using (true)
with check (true);

grant select, insert, update on table public.submissions to anon, authenticated;

-- 9) Helper RPC to increment submission counter by hackathon slug.
create or replace function public.increment_hackathon_submissions(p_slug text)
returns void
language plpgsql
security definer
as $$
begin
  update public.hackathons
  set submissions = coalesce(submissions, 0) + 1,
      updated_at = now()
  where slug = p_slug;
end;
$$;

grant execute on function public.increment_hackathon_submissions(text) to anon, authenticated;

commit;
