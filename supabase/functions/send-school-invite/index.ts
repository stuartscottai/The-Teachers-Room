import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

type InviteEmailPayload = {
  schoolId: string;
  schoolName: string;
  inviteeEmail: string;
  inviteToken?: string | null;
  expiresAt?: string | null;
  appUrl?: string;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const asText = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

const sanitizeSchoolName = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const toInviteExpiryText = (value: string | null | undefined) => {
  if (!value) return '7 days';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '7 days';
  return parsed.toUTCString();
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const payload = (await req.json()) as InviteEmailPayload;
    const schoolId = asText(payload?.schoolId);
    const schoolName = asText(payload?.schoolName);
    const inviteeEmail = asText(payload?.inviteeEmail).toLowerCase();
    const inviteToken = asText(payload?.inviteToken || '');
    const expiresAt = asText(payload?.expiresAt || '');
    const appUrl = asText(payload?.appUrl || Deno.env.get('APP_BASE_URL') || '');

    if (!schoolId || !schoolName || !inviteeEmail) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(JSON.stringify({ error: 'Supabase env vars are missing' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: isAdmin, error: adminError } = await supabase.rpc('current_user_is_school_admin', {
      p_school_id: schoolId
    });
    if (adminError) {
      return new Response(JSON.stringify({ error: adminError.message || 'Authorization check failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Not authorized for this school' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const inviteFromEmail = asText(Deno.env.get('INVITE_FROM_EMAIL') || 'The Teachers Room <onboarding@resend.dev>');
    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY is not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const safeSchoolName = sanitizeSchoolName(schoolName);
    const expiresText = toInviteExpiryText(expiresAt || null);
    const loginUrl = appUrl || '';
    const supportText = inviteToken
      ? `Invite code: ${inviteToken}`
      : 'Use the same email address to sign up or log in.';

    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#0f172a;">
        <h2 style="margin:0 0 12px;">You are invited to join ${safeSchoolName}</h2>
        <p style="margin:0 0 10px;">A school admin invited <strong>${inviteeEmail}</strong> to the School plan.</p>
        <p style="margin:0 0 10px;">This invite expires: <strong>${expiresText}</strong></p>
        ${loginUrl ? `<p style="margin:16px 0;"><a href="${loginUrl}" style="background:#0284c7;color:#fff;padding:10px 14px;text-decoration:none;border-radius:8px;display:inline-block;">Open The Teachers' Room</a></p>` : ''}
        <p style="margin:0 0 10px;">${supportText}</p>
        <p style="margin:12px 0 0;">After login, school access is applied automatically if your email matches this invite.</p>
      </div>
    `;

    const text = [
      `You are invited to join ${schoolName}.`,
      `Invited email: ${inviteeEmail}`,
      `Expires: ${expiresText}`,
      loginUrl ? `Open app: ${loginUrl}` : '',
      supportText,
      'After login, school access is applied automatically if your email matches this invite.'
    ]
      .filter(Boolean)
      .join('\n');

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: inviteFromEmail,
        to: [inviteeEmail],
        subject: `Invitation to join ${schoolName} on The Teachers' Room`,
        html,
        text
      })
    });

    const resendData = await resendResponse.json().catch(() => ({}));
    if (!resendResponse.ok) {
      const message = (resendData && (resendData as any).message) || 'Email provider rejected request';
      return new Response(JSON.stringify({ error: message, provider: resendData }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ ok: true, providerId: (resendData as any)?.id || null }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
