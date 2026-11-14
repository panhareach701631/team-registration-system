-- ====================================================================
-- HOTFIX: ADMIN LOGIN & PGCRYPTO EXTENSION SEARCH PATH
-- Run this in Supabase SQL Editor to fix admin login when pgcrypto
-- lives in the 'extensions' schema or admins seed row was missing.
-- ====================================================================

create extension if not exists pgcrypto;

-- Ensure admin_sessions has required columns if upgrading from an older table
alter table if exists admin_sessions
  add column if not exists expires_at timestamptz not null default (now() + interval '7 days');

-- Ensure at least the default admin access code exists (non-destructive)
insert into admins (username, access_code_hash)
select 'admin', crypt('REACH701631', gen_salt('bf'))
where not exists (select 1 from admins where username = 'admin');

-- Update auth functions to include 'extensions' schema in search_path
create or replace function _assert_admin_session(p_session_token text)
returns void
language plpgsql
security definer
set search_path = public, extensions
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

create or replace function verify_admin_code(input_code text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  is_valid boolean;
  new_token text;
  v_expires timestamptz;
begin
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
set search_path = public, extensions
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
set search_path = public, extensions
as $$
begin
  if p_session_token is not null and trim(p_session_token) <> '' then
    delete from admin_sessions where token = p_session_token;
  end if;
  return true;
end;
$$;

grant execute on function verify_admin_code(text) to anon, authenticated;
grant execute on function validate_admin_session(text) to anon, authenticated;
grant execute on function admin_logout_session(text) to anon, authenticated;
