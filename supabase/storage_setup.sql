-- ====================================================================
-- SUPABASE STORAGE SETUP: 'team-media' BUCKET & ACCESS POLICIES
-- Run in Supabase SQL Editor after running the database migration.
-- ====================================================================

-- 1. Create public-read bucket with strict file size (3 MB) and MIME constraints
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'team-media',
  'team-media',
  true,
  3145728, -- 3 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = true,
  file_size_limit = 3145728,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

-- 2. Drop any legacy permissive policies if they existed
drop policy if exists "Public Read Access for team-media" on storage.objects;
drop policy if exists "Allow anon uploads to team-media" on storage.objects;

-- 3. Allow public read-only access to images stored in team-media
create policy "Public Read Access for team-media"
on storage.objects for select
using (bucket_id = 'team-media');

-- NOTE:
-- Do NOT grant public/anon INSERT, UPDATE, or DELETE on storage.objects.
-- All uploads go securely through the 'upload-media' Edge Function, which
-- verifies the admin session token (or open event registration token for
-- player avatars) before writing via the server-side service_role key.
