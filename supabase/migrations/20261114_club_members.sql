-- ====================================================================
-- CLUB MEMBERS DIRECTORY MIGRATION (NON-DESTRUCTIVE)
-- Adds club_members table + secure SECURITY DEFINER RPCs for CRUD.
-- Safe to run after 20261114_upgrade_security_and_images.sql.
-- ====================================================================

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
create index if not exists idx_club_members_created_at on club_members(created_at);

alter table club_members enable row level security;
revoke all on table club_members from public, anon, authenticated;

-- List all club members (Admin authenticated via _assert_admin_session)
create or replace function admin_get_club_members(p_session_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  perform _assert_admin_session(p_session_token);

  select coalesce(jsonb_agg(row_to_json(m)::jsonb order by m.created_at asc, m.jersey_name asc), '[]'::jsonb)
  into v_result
  from club_members m;

  return v_result;
end;
$$;

-- Create club member
create or replace function admin_create_club_member(
  p_session_token text,
  p_jersey_name text,
  p_full_name text default '',
  p_jersey_number text default '',
  p_position text default '',
  p_phone text default '',
  p_telegram_status text default 'JOINED',
  p_uniform_status text default 'RECEIVED',
  p_avatar_url text default '',
  p_notes text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row club_members%rowtype;
  v_tg text;
  v_uni text;
begin
  perform _assert_admin_session(p_session_token);

  if p_jersey_name is null or trim(p_jersey_name) = '' then
    raise exception 'Member name is required.';
  end if;

  v_tg := case when p_telegram_status = 'NOT_JOINED' then 'NOT_JOINED' else 'JOINED' end;
  v_uni := case when p_uniform_status = 'NOT_YET' then 'NOT_YET' else 'RECEIVED' end;

  insert into club_members (
    jersey_name,
    full_name,
    jersey_number,
    position,
    phone,
    telegram_status,
    uniform_status,
    avatar_url,
    notes
  )
  values (
    trim(p_jersey_name),
    coalesce(nullif(trim(p_full_name), ''), trim(p_jersey_name)),
    coalesce(trim(p_jersey_number), ''),
    coalesce(trim(p_position), ''),
    coalesce(trim(p_phone), ''),
    v_tg,
    v_uni,
    coalesce(p_avatar_url, ''),
    coalesce(trim(p_notes), '')
  )
  returning * into v_row;

  return row_to_json(v_row)::jsonb;
end;
$$;

-- Update club member
create or replace function admin_update_club_member(
  p_session_token text,
  p_member_id uuid,
  p_jersey_name text,
  p_full_name text default '',
  p_jersey_number text default '',
  p_position text default '',
  p_phone text default '',
  p_telegram_status text default 'JOINED',
  p_uniform_status text default 'RECEIVED',
  p_avatar_url text default '',
  p_notes text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row club_members%rowtype;
  v_tg text;
  v_uni text;
begin
  perform _assert_admin_session(p_session_token);

  if p_jersey_name is null or trim(p_jersey_name) = '' then
    raise exception 'Member name is required.';
  end if;

  v_tg := case when p_telegram_status = 'NOT_JOINED' then 'NOT_JOINED' else 'JOINED' end;
  v_uni := case when p_uniform_status = 'NOT_YET' then 'NOT_YET' else 'RECEIVED' end;

  update club_members
  set
    jersey_name = trim(p_jersey_name),
    full_name = coalesce(nullif(trim(p_full_name), ''), trim(p_jersey_name)),
    jersey_number = coalesce(trim(p_jersey_number), ''),
    position = coalesce(trim(p_position), ''),
    phone = coalesce(trim(p_phone), ''),
    telegram_status = v_tg,
    uniform_status = v_uni,
    avatar_url = coalesce(p_avatar_url, avatar_url, ''),
    notes = coalesce(trim(p_notes), ''),
    updated_at = now()
  where id = p_member_id
  returning * into v_row;

  if not found then
    raise exception 'Member not found.';
  end if;

  return row_to_json(v_row)::jsonb;
end;
$$;

-- Delete club member
create or replace function admin_delete_club_member(
  p_session_token text,
  p_member_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  perform _assert_admin_session(p_session_token);

  delete from club_members where id = p_member_id;
  return true;
end;
$$;

revoke all on function admin_get_club_members(text) from public;
grant execute on function admin_get_club_members(text) to anon, authenticated;

revoke all on function admin_create_club_member(text, text, text, text, text, text, text, text, text, text) from public;
grant execute on function admin_create_club_member(text, text, text, text, text, text, text, text, text, text) to anon, authenticated;

revoke all on function admin_update_club_member(text, uuid, text, text, text, text, text, text, text, text, text) from public;
grant execute on function admin_update_club_member(text, uuid, text, text, text, text, text, text, text, text, text) to anon, authenticated;

revoke all on function admin_delete_club_member(text, uuid) from public;
grant execute on function admin_delete_club_member(text, uuid) to anon, authenticated;
