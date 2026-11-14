-- ====================================================================
-- TEAM REGISTRATION MANAGEMENT SYSTEM - FULL SCHEMA (FRESH INSTALL)
-- Safe & non-destructive (uses IF NOT EXISTS).
-- For existing databases, run: supabase/migrations/20261114_upgrade_security_and_images.sql
-- ====================================================================

create extension if not exists pgcrypto;

-- 1. Tables
create table if not exists admins (
  id uuid primary key default gen_random_uuid(),
  username text unique not null default 'admin',
  access_code_hash text not null,
  created_at timestamptz not null default now()
);

-- Seed initial admin access code ONLY if not already present (preserves custom passwords)
insert into admins (username, access_code_hash)
values ('admin', crypt('REACH701631', gen_salt('bf')))
on conflict (username) do nothing;

create table if not exists admin_sessions (
  id uuid primary key default gen_random_uuid(),
  token text unique not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days')
);

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  topic text not null,
  event_time text not null default '',
  location text not null default '',
  registration_token text unique not null,
  status text not null default 'OPEN' check (status in ('OPEN', 'CLOSED')),
  cover_image_url text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  team_letter text not null check (team_letter in ('A', 'B', 'C')),
  team_name text not null,
  captain_name text not null,
  team_color text not null default '#2563EB',
  logo_url text not null default '',
  created_at timestamptz not null default now(),
  unique(event_id, team_letter)
);

create table if not exists registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  team_letter text not null check (team_letter in ('A', 'B', 'C')),
  name text not null,
  normalized_name text not null,
  player_no text not null,
  player_no_norm text not null,
  number_of_players integer not null default 1,
  avatar_url text not null default '',
  created_at timestamptz not null default now(),
  unique (event_id, normalized_name),
  unique (event_id, player_no_norm)
);

create index if not exists idx_events_token on events(registration_token);
create index if not exists idx_events_status on events(status);
create index if not exists idx_registrations_event_team on registrations(event_id, team_letter);
create index if not exists idx_registrations_event_norm_name on registrations(event_id, normalized_name);
create index if not exists idx_registrations_event_player_no on registrations(event_id, player_no_norm);

create table if not exists club_members (
  id uuid primary key default gen_random_uuid(),
  jersey_name text not null,
  full_name text not null default '',
  jersey_number text not null default '',
  position text not null default '',
  phone text not null default '',
  telegram_status text not null default 'JOINED' check (telegram_status in ('JOINED', 'NOT_JOINED')),
  uniform_status text not null default 'RECEIVED' check (uniform_status in ('RECEIVED', 'NOT_YET')),
  avatar_url text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_club_members_jersey_name on club_members(jersey_name);

-- Next: run supabase/migrations/20261114_upgrade_security_and_images.sql
-- and supabase/migrations/20261114_club_members.sql
-- to apply strict RLS policies, revoke direct table access, and create all secure RPCs.
-- Then run supabase/storage_setup.sql to configure the 'team-media' storage bucket.
