-- ====================================================================
-- TEAM REGISTRATION MANAGEMENT SYSTEM - SAFE SECURITY & IMAGE MIGRATION
-- Non-destructive migration: preserves ALL existing records (no DROP TABLE)
-- ====================================================================

create extension if not exists pgcrypto;

-- 1. Safely add image support columns to existing tables
alter table if exists events
  add column if not exists cover_image_url text not null default '';

alter table if exists teams
  add column if not exists logo_url text not null default '';

alter table if exists registrations
  add column if not exists avatar_url text not null default '';

-- 2. Remove overly permissive / insecure RLS policies
drop policy if exists "Allow full access to events for admin" on events;
drop policy if exists "Allow full access to teams for admin" on teams;
drop policy if exists "Allow full access to registrations for admin" on registrations;
drop policy if exists "Allow public insert to registrations when event is open" on registrations;
drop policy if exists "Allow public read access to events" on events;
drop policy if exists "Allow public read access to teams" on teams;
drop policy if exists "Allow public read access to registrations" on registrations;

-- 3. Ensure RLS is enabled on ALL tables (deny-by-default for anon/authenticated REST access)
alter table events enable row level security;
alter table teams enable row level security;
alter table registrations enable row level security;
alter table admin_sessions enable row level security;
alter table admins enable row level security;

-- Revoke direct table privileges from anon and authenticated roles.
-- All public and admin data access flows exclusively through validated SECURITY DEFINER RPCs.
revoke all on table admins from anon, authenticated;
revoke all on table admin_sessions from anon, authenticated;
revoke all on table events from anon, authenticated;
revoke all on table teams from anon, authenticated;
revoke all on table registrations from anon, authenticated;

-- 4. Internal server-side session assertion helper (NOT executable by anon/authenticated)
create or replace function _assert_admin_session(p_session_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_session_token is null or trim(p_session_token) = '' then
    raise exception 'Unauthorized: Missing admin session token' using errcode = '42501';
  end if;

  if not exists (
    select 1 from admin_sessions
    where token = p_session_token
      and expires_at > now()
  ) then
    raise exception 'Unauthorized: Invalid or expired admin session' using errcode = '42501';
  end if;
end;
$$;

revoke all on function _assert_admin_session(text) from public, anon, authenticated;

-- 5. Hardened Auth RPCs
create or replace function verify_admin_code(input_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  is_valid boolean;
  new_token text;
  v_expires timestamptz;
begin
  -- Clean up expired sessions
  delete from admin_sessions where expires_at <= now();

  if input_code is null or trim(input_code) = '' then
    return jsonb_build_object('success', false, 'error', 'Access code is required.');
  end if;

  select exists(
    select 1 from admins
    where access_code_hash = crypt(trim(input_code), access_code_hash)
  ) into is_valid;

  if is_valid then
    new_token := encode(gen_random_bytes(32), 'hex');
    v_expires := now() + interval '7 days';

    insert into admin_sessions(token, expires_at)
    values (new_token, v_expires);

    return jsonb_build_object(
      'success', true,
      'token', new_token,
      'expires_at', v_expires
    );
  else
    return jsonb_build_object(
      'success', false,
      'error', 'Invalid access code'
    );
  end if;
end;
$$;

create or replace function validate_admin_session(session_token text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if session_token is null or trim(session_token) = '' then
    return false;
  end if;

  return exists(
    select 1 from admin_sessions
    where token = session_token and expires_at > now()
  );
end;
$$;

create or replace function admin_logout_session(p_session_token text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_session_token is not null and trim(p_session_token) <> '' then
    delete from admin_sessions where token = p_session_token;
  end if;
  return true;
end;
$$;

-- 6. Public Read & Registration RPCs (scoped strictly by registration_token)
create or replace function get_public_event_by_token(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event events%rowtype;
  v_teams jsonb;
  v_registrations jsonb;
begin
  if p_token is null or trim(p_token) = '' then
    return null;
  end if;

  select * into v_event
  from events
  where registration_token = trim(p_token);

  if not found then
    return null;
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', t.id,
      'team_letter', t.team_letter,
      'team_name', t.team_name,
      'captain_name', t.captain_name,
      'team_color', t.team_color,
      'logo_url', coalesce(t.logo_url, '')
    ) order by t.team_letter asc
  ), '[]'::jsonb)
  into v_teams
  from teams t
  where t.event_id = v_event.id;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', r.id,
      'team_letter', r.team_letter,
      'name', r.name,
      'player_no', r.player_no,
      'avatar_url', coalesce(r.avatar_url, ''),
      'created_at', r.created_at
    ) order by r.created_at desc
  ), '[]'::jsonb)
  into v_registrations
  from registrations r
  where r.event_id = v_event.id;

  return jsonb_build_object(
    'id', v_event.id,
    'topic', v_event.topic,
    'event_time', v_event.event_time,
    'location', v_event.location,
    'registration_token', v_event.registration_token,
    'status', v_event.status,
    'cover_image_url', coalesce(v_event.cover_image_url, ''),
    'created_at', v_event.created_at,
    'teams', v_teams,
    'registrations', v_registrations
  );
end;
$$;

drop function if exists submit_member_registration(text, text, text, text);

create or replace function submit_member_registration(
  p_token text,
  p_team_letter text,
  p_name text,
  p_player_no text,
  p_avatar_url text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event events%rowtype;
  v_normalized_name text;
  v_player_no_norm text;
  v_registration_id uuid;
  v_created_at timestamptz;
  v_clean_avatar text;
begin
  select * into v_event from events where registration_token = trim(p_token);
  if not found then
    return jsonb_build_object('success', false, 'error', 'Event not found. Please check your registration link.');
  end if;

  if v_event.status <> 'OPEN' then
    return jsonb_build_object('success', false, 'error', 'Registration is currently closed. Please contact the administrator.');
  end if;

  if p_team_letter not in ('A', 'B', 'C') then
    return jsonb_build_object('success', false, 'error', 'Invalid team selection. Choose Team A, B, or C.');
  end if;

  v_player_no_norm := trim(p_player_no);
  if v_player_no_norm ~ '^[0-9]+$' then
    v_player_no_norm := coalesce(nullif(regexp_replace(v_player_no_norm, '^0+', ''), ''), '0');
  else
    v_player_no_norm := lower(v_player_no_norm);
  end if;

  if v_player_no_norm is null or v_player_no_norm = '' then
    return jsonb_build_object('success', false, 'error', 'Player Number is required.');
  end if;

  v_normalized_name := lower(regexp_replace(trim(p_name), '\s+', ' ', 'g'));
  if length(v_normalized_name) < 2 then
    return jsonb_build_object('success', false, 'error', 'Please enter a valid name (at least 2 characters).');
  end if;

  if exists (
    select 1 from registrations
    where event_id = v_event.id and normalized_name = v_normalized_name
  ) then
    return jsonb_build_object(
      'success', false,
      'error', 'This name is already registered for this event. Duplicate registrations are not allowed.'
    );
  end if;

  if exists (
    select 1 from registrations
    where event_id = v_event.id and player_no_norm = v_player_no_norm
  ) then
    return jsonb_build_object(
      'success', false,
      'error', 'Player Number #' || trim(p_player_no) || ' is already taken for this event. Please choose another number.'
    );
  end if;

  v_clean_avatar := coalesce(trim(p_avatar_url), '');

  insert into registrations (
    event_id,
    team_letter,
    name,
    normalized_name,
    player_no,
    player_no_norm,
    number_of_players,
    avatar_url
  )
  values (
    v_event.id,
    p_team_letter,
    trim(p_name),
    v_normalized_name,
    trim(p_player_no),
    v_player_no_norm,
    1,
    v_clean_avatar
  )
  returning id, created_at into v_registration_id, v_created_at;

  return jsonb_build_object(
    'success', true,
    'registration_id', v_registration_id,
    'event_topic', v_event.topic,
    'name', trim(p_name),
    'team_letter', p_team_letter,
    'player_no', trim(p_player_no),
    'avatar_url', v_clean_avatar,
    'created_at', v_created_at
  );
end;
$$;

-- 7. Trusted Admin RPCs (All verify admin session token server-side)
create or replace function admin_get_events(p_session_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  perform _assert_admin_session(p_session_token);

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', e.id,
      'topic', e.topic,
      'event_time', e.event_time,
      'location', e.location,
      'registration_token', e.registration_token,
      'status', e.status,
      'cover_image_url', coalesce(e.cover_image_url, ''),
      'created_at', e.created_at,
      'updated_at', e.updated_at,
      'teams', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'id', t.id,
            'event_id', t.event_id,
            'team_letter', t.team_letter,
            'team_name', t.team_name,
            'captain_name', t.captain_name,
            'team_color', t.team_color,
            'logo_url', coalesce(t.logo_url, ''),
            'created_at', t.created_at
          ) order by t.team_letter asc
        )
        from teams t where t.event_id = e.id
      ), '[]'::jsonb),
      'registrations', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'id', r.id,
            'event_id', r.event_id,
            'team_letter', r.team_letter,
            'name', r.name,
            'normalized_name', r.normalized_name,
            'player_no', r.player_no,
            'player_no_norm', r.player_no_norm,
            'number_of_players', r.number_of_players,
            'avatar_url', coalesce(r.avatar_url, ''),
            'created_at', r.created_at
          ) order by r.created_at desc
        )
        from registrations r where r.event_id = e.id
      ), '[]'::jsonb)
    ) order by e.created_at desc
  ), '[]'::jsonb)
  into v_result
  from events e;

  return v_result;
end;
$$;

create or replace function admin_get_event_by_id(p_session_token text, p_event_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event events%rowtype;
  v_teams jsonb;
  v_registrations jsonb;
begin
  perform _assert_admin_session(p_session_token);

  select * into v_event from events where id = p_event_id;
  if not found then
    return null;
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', t.id,
      'event_id', t.event_id,
      'team_letter', t.team_letter,
      'team_name', t.team_name,
      'captain_name', t.captain_name,
      'team_color', t.team_color,
      'logo_url', coalesce(t.logo_url, ''),
      'created_at', t.created_at
    ) order by t.team_letter asc
  ), '[]'::jsonb)
  into v_teams
  from teams t where t.event_id = v_event.id;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', r.id,
      'event_id', r.event_id,
      'team_letter', r.team_letter,
      'name', r.name,
      'normalized_name', r.normalized_name,
      'player_no', r.player_no,
      'player_no_norm', r.player_no_norm,
      'number_of_players', r.number_of_players,
      'avatar_url', coalesce(r.avatar_url, ''),
      'created_at', r.created_at
    ) order by r.created_at desc
  ), '[]'::jsonb)
  into v_registrations
  from registrations r where r.event_id = v_event.id;

  return jsonb_build_object(
    'id', v_event.id,
    'topic', v_event.topic,
    'event_time', v_event.event_time,
    'location', v_event.location,
    'registration_token', v_event.registration_token,
    'status', v_event.status,
    'cover_image_url', coalesce(v_event.cover_image_url, ''),
    'created_at', v_event.created_at,
    'updated_at', v_event.updated_at,
    'teams', v_teams,
    'registrations', v_registrations
  );
end;
$$;

create or replace function admin_create_event(
  p_session_token text,
  p_topic text,
  p_event_time text,
  p_location text,
  p_registration_token text,
  p_cover_image_url text default '',
  p_teams jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
  v_team jsonb;
begin
  perform _assert_admin_session(p_session_token);

  if trim(coalesce(p_topic, '')) = '' then
    raise exception 'Event topic is required';
  end if;

  insert into events (
    topic,
    event_time,
    location,
    registration_token,
    status,
    cover_image_url
  )
  values (
    trim(p_topic),
    trim(coalesce(p_event_time, '')),
    trim(coalesce(p_location, '')),
    trim(p_registration_token),
    'OPEN',
    coalesce(trim(p_cover_image_url), '')
  )
  returning id into v_event_id;

  for v_team in select * from jsonb_array_elements(coalesce(p_teams, '[]'::jsonb))
  loop
    insert into teams (
      event_id,
      team_letter,
      team_name,
      captain_name,
      team_color,
      logo_url
    )
    values (
      v_event_id,
      v_team->>'team_letter',
      coalesce(nullif(trim(v_team->>'team_name'), ''), 'Team ' || (v_team->>'team_letter')),
      coalesce(nullif(trim(v_team->>'captain_name'), ''), 'Captain'),
      coalesce(nullif(trim(v_team->>'team_color'), ''), '#2563EB'),
      coalesce(trim(v_team->>'logo_url'), '')
    );
  end loop;

  return admin_get_event_by_id(p_session_token, v_event_id);
end;
$$;

create or replace function admin_update_event(
  p_session_token text,
  p_event_id uuid,
  p_topic text,
  p_event_time text,
  p_location text,
  p_cover_image_url text default '',
  p_teams jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team jsonb;
begin
  perform _assert_admin_session(p_session_token);

  update events
  set
    topic = trim(p_topic),
    event_time = trim(coalesce(p_event_time, '')),
    location = trim(coalesce(p_location, '')),
    cover_image_url = coalesce(trim(p_cover_image_url), cover_image_url),
    updated_at = now()
  where id = p_event_id;

  if not found then
    raise exception 'Event not found';
  end if;

  for v_team in select * from jsonb_array_elements(coalesce(p_teams, '[]'::jsonb))
  loop
    insert into teams (
      event_id,
      team_letter,
      team_name,
      captain_name,
      team_color,
      logo_url
    )
    values (
      p_event_id,
      v_team->>'team_letter',
      coalesce(nullif(trim(v_team->>'team_name'), ''), 'Team ' || (v_team->>'team_letter')),
      coalesce(nullif(trim(v_team->>'captain_name'), ''), 'Captain'),
      coalesce(nullif(trim(v_team->>'team_color'), ''), '#2563EB'),
      coalesce(trim(v_team->>'logo_url'), '')
    )
    on conflict (event_id, team_letter) do update
    set
      team_name = excluded.team_name,
      captain_name = excluded.captain_name,
      team_color = excluded.team_color,
      logo_url = excluded.logo_url;
  end loop;

  return admin_get_event_by_id(p_session_token, p_event_id);
end;
$$;

create or replace function admin_set_event_status(
  p_session_token text,
  p_event_id uuid,
  p_status text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  perform _assert_admin_session(p_session_token);

  if p_status not in ('OPEN', 'CLOSED') then
    raise exception 'Invalid status. Must be OPEN or CLOSED';
  end if;

  update events
  set status = p_status, updated_at = now()
  where id = p_event_id;

  return found;
end;
$$;

create or replace function admin_delete_event(
  p_session_token text,
  p_event_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  perform _assert_admin_session(p_session_token);
  delete from events where id = p_event_id;
  return found;
end;
$$;

create or replace function admin_update_registration(
  p_session_token text,
  p_registration_id uuid,
  p_name text,
  p_team_letter text,
  p_player_no text,
  p_avatar_url text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing registrations%rowtype;
  v_norm_name text;
  v_norm_no text;
  v_updated jsonb;
begin
  perform _assert_admin_session(p_session_token);

  select * into v_existing from registrations where id = p_registration_id;
  if not found then
    raise exception 'Registration not found';
  end if;

  if p_team_letter not in ('A', 'B', 'C') then
    raise exception 'Invalid team selection';
  end if;

  v_norm_name := lower(regexp_replace(trim(p_name), '\s+', ' ', 'g'));
  if length(v_norm_name) < 2 then
    raise exception 'Player name must be at least 2 characters';
  end if;

  v_norm_no := trim(p_player_no);
  if v_norm_no ~ '^[0-9]+$' then
    v_norm_no := coalesce(nullif(regexp_replace(v_norm_no, '^0+', ''), ''), '0');
  else
    v_norm_no := lower(v_norm_no);
  end if;

  if v_norm_no = '' then
    raise exception 'Player number is required';
  end if;

  if exists (
    select 1 from registrations
    where event_id = v_existing.event_id
      and normalized_name = v_norm_name
      and id <> p_registration_id
  ) then
    raise exception 'Another player in this event already uses that name.';
  end if;

  if exists (
    select 1 from registrations
    where event_id = v_existing.event_id
      and player_no_norm = v_norm_no
      and id <> p_registration_id
  ) then
    raise exception 'Player Number #% is already taken in this event.', trim(p_player_no);
  end if;

  update registrations
  set
    name = trim(p_name),
    normalized_name = v_norm_name,
    team_letter = p_team_letter,
    player_no = trim(p_player_no),
    player_no_norm = v_norm_no,
    avatar_url = coalesce(p_avatar_url, avatar_url)
  where id = p_registration_id;

  select to_jsonb(r.*) into v_updated from registrations r where r.id = p_registration_id;
  return v_updated;
end;
$$;

create or replace function admin_delete_registration(
  p_session_token text,
  p_registration_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  perform _assert_admin_session(p_session_token);
  delete from registrations where id = p_registration_id;
  return found;
end;
$$;

-- 8. Explicit RPC Execution Grants
grant execute on function verify_admin_code(text) to anon, authenticated;
grant execute on function validate_admin_session(text) to anon, authenticated;
grant execute on function admin_logout_session(text) to anon, authenticated;
grant execute on function get_public_event_by_token(text) to anon, authenticated;
grant execute on function submit_member_registration(text, text, text, text, text) to anon, authenticated;
grant execute on function admin_get_events(text) to anon, authenticated;
grant execute on function admin_get_event_by_id(text, uuid) to anon, authenticated;
grant execute on function admin_create_event(text, text, text, text, text, text, jsonb) to anon, authenticated;
grant execute on function admin_update_event(text, uuid, text, text, text, text, jsonb) to anon, authenticated;
grant execute on function admin_set_event_status(text, uuid, text) to anon, authenticated;
grant execute on function admin_delete_event(text, uuid) to anon, authenticated;
grant execute on function admin_update_registration(text, uuid, text, text, text, text) to anon, authenticated;
grant execute on function admin_delete_registration(text, uuid) to anon, authenticated;
