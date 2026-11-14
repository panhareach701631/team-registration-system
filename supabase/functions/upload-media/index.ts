// Supabase Edge Function: upload-media
// Deploy with: supabase functions deploy upload-media
// Validates admin session token (for event covers & team logos) OR open event token (for player avatars)
// Uses SUPABASE_SERVICE_ROLE_KEY strictly on the server side (never exposed to browser).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-session, x-registration-token',
};

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_BYTES = 3 * 1024 * 1024; // 3 MB

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Server storage configuration missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const formData = await req.formData();
    const file = formData.get('file');
    const folder = String(formData.get('folder') || 'players');

    if (!file || !(file instanceof File)) {
      return new Response(
        JSON.stringify({ error: 'Image file is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return new Response(
        JSON.stringify({ error: 'Invalid file type. Only JPG, PNG, and WEBP are allowed.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (file.size > MAX_BYTES) {
      return new Response(
        JSON.stringify({ error: 'File size exceeds 3MB limit.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!['events', 'teams', 'players'].includes(folder)) {
      return new Response(
        JSON.stringify({ error: 'Invalid upload folder' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const adminSession = req.headers.get('x-admin-session') || '';
    const registrationToken = req.headers.get('x-registration-token') || '';

    let authorized = false;

    if (adminSession) {
      const { data: sessionRow } = await supabaseAdmin
        .from('admin_sessions')
        .select('id, expires_at')
        .eq('token', adminSession)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (sessionRow) {
        authorized = true;
      }
    }

    // Players registering on an OPEN event can upload to 'players' folder
    if (!authorized && folder === 'players' && registrationToken) {
      const { data: eventRow } = await supabaseAdmin
        .from('events')
        .select('id, status')
        .eq('registration_token', registrationToken)
        .eq('status', 'OPEN')
        .maybeSingle();

      if (eventRow) {
        authorized = true;
      }
    }

    if (!authorized) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized image upload request' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const fileName = `${folder}/${crypto.randomUUID()}.${ext}`;
    const buffer = await file.arrayBuffer();

    const { error: uploadErr } = await supabaseAdmin.storage
      .from('team-media')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadErr) {
      return new Response(
        JSON.stringify({ error: uploadErr.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: urlData } = supabaseAdmin.storage
      .from('team-media')
      .getPublicUrl(fileName);

    return new Response(
      JSON.stringify({ url: urlData.publicUrl, path: fileName }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || 'Upload failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
