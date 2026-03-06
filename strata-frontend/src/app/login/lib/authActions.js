import { supabase } from '@/utils/supabase/client';

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL;

if (!API_BASE) {
  throw new Error('NEXT_PUBLIC_BACKEND_URL is not set.');
}

const CLEAN_API_BASE = API_BASE.replace(/\/$/, '');

async function parseJsonResponse(res) {
  const text = await res.text();
  let json = null;

  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(
      `Expected JSON from ${res.url}, received: ${text.slice(0, 120)}`
    );
  }

  if (!res.ok) {
    throw new Error(json.error || 'Request failed.');
  }

  return json;
}

export async function checkEmailForAccount(email) {
  const trimmed = email.trim().toLowerCase();

  const { data, error } = await supabase.rpc('check_email_for_account', {
    p_email: trimmed,
  });

  if (error) throw error;

  return {
    exists: !!data?.[0]?.account_exists,
    email: trimmed,
  };
}

export async function checkUserStatus(email) {
  const res = await fetch(`${CLEAN_API_BASE}/api/check-user`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
    }),
  });

  return await parseJsonResponse(res);
}

export async function resolveInviteToken(token) {
  if (!token) {
    throw new Error('Missing invite token.');
  }

  const res = await fetch(
    `${CLEAN_API_BASE}/api/resolve-invite?token=${encodeURIComponent(token)}`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    }
  );

  const json = await parseJsonResponse(res);
  return json.invite;
}

export async function sendInviteEmail({
  email,
  role,
  building_label,
  unit_label,
  token,
  expires_at,
}) {
  const res = await fetch(`${CLEAN_API_BASE}/api/send-invite-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      role,
      building_label,
      unit_label,
      token,
      expires_at,
    }),
  });

  return await parseJsonResponse(res);
}

export async function signInWithPassword(
  email,
  password,
  rememberMe,
  termsVersion
) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;

  if (data.session) {
    await supabase.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
  }

  if (termsVersion) {
    const { error: termsErr } = await supabase.rpc(
      'ensure_terms_acceptance_for_current_user',
      { p_terms_version: termsVersion }
    );

    if (termsErr) {
      console.warn(
        'ensure_terms_acceptance_for_current_user error:',
        termsErr.message
      );
    }
  }

  const { data: me } = await supabase.auth.getUser();
  return me?.user?.id ?? null;
}

export async function acceptInviteForCurrentUser(token) {
  if (!token) {
    throw new Error('Missing invite token.');
  }

  const { data, error } = await supabase.rpc('accept_invite', {
    p_token: token,
  });

  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;

  if (!row?.ok) {
    throw new Error(row?.message || 'Failed to accept invite.');
  }

  return row;
}

export async function getProfileWithBuilding(userId) {
  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select(
      `
      full_name,
      role,
      building_id,
      unit_id,
      units!user_profiles_unit_id_fkey ( building_id )
    `
    )
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;

  const buildingId =
    profile?.building_id || profile?.units?.building_id || null;

  return { profile, buildingId };
}

export function landingPath(role, buildingId) {
  switch (role) {
    case 'manager':
      return buildingId
        ? `/manager/buildings/${buildingId}/dashboard`
        : '/manager/dashboard';
    case 'owner':
      return buildingId
        ? `/owner/buildings/${buildingId}/dashboard`
        : '/owner/dashboard';
    case 'tenant':
      return buildingId
        ? `/tenant/buildings/${buildingId}/dashboard`
        : '/tenant/dashboard';
    default:
      return '/';
  }
}

export async function sendPasswordReset(email) {
  const origin =
    typeof window !== 'undefined'
      ? window.location.origin
      : process.env.NEXT_PUBLIC_SITE_URL;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/login?reset=true#recover`,
  });

  if (error) throw error;
}

export async function requestSignupCode({
  email,
  password,
  full_name,
  role,
  invite_token = null,
  invite_id = null,
}) {
  const res = await fetch(`${CLEAN_API_BASE}/api/request-signup-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      password,
      full_name,
      role,
      invite_token,
      invite_id,
    }),
  });

  return await parseJsonResponse(res);
}

export async function registerVerifiedUser({
  email,
  password,
  full_name,
  role,
  code,
  invite_token = null,
  invite_id = null,
}) {
  const res = await fetch(`${CLEAN_API_BASE}/api/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      password,
      full_name,
      role,
      code,
      invite_token,
      invite_id,
    }),
  });

  return await parseJsonResponse(res);
}
