const express = require('express');

const { supabase } = require('./lib/supabaseClient');
const { supabaseAdmin } = require('./lib/supabaseAdmin');
const { resend } = require('./lib/resend');

const {
  OTP_TTL_MINUTES,
  normalizeEmail,
  generateSixDigitCode,
  hashCode,
  expiryDate,
} = require('../utils/emailVerification');

const router = express.Router();

async function checkAccountExists(email) {
  const { data, error } = await supabase.rpc('check_email_for_account', {
    p_email: email,
  });

  if (error) {
    throw new Error(error.message || 'Failed to check account status.');
  }

  return !!data?.[0]?.account_exists;
}

async function resolvePendingInviteByToken(token) {
  const trimmed = String(token || '').trim();
  if (!trimmed) return null;

  const { data, error } = await supabaseAdmin.rpc(
    'resolve_pending_invite_by_token',
    {
      p_token: trimmed,
    }
  );

  if (error) {
    throw new Error(error.message || 'Failed to resolve invite token.');
  }

  const row = Array.isArray(data) ? data[0] : data;
  return row || null;
}

async function resolvePendingInviteById(inviteId, email) {
  const nowIso = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from('invitations')
    .select(
      `
      id,
      email,
      email_norm,
      role,
      building_id,
      unit_id,
      expires_at,
      buildings(id,name,address),
      units(id,label,unit_number,floor)
    `
    )
    .eq('id', inviteId)
    .eq('email_norm', normalizeEmail(email))
    .eq('status', 'pending')
    .gt('expires_at', nowIso)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Failed to resolve invite.');
  }

  if (!data) return null;

  return {
    invite_id: data.id,
    email: data.email,
    role: data.role,
    building_id: data.building_id,
    unit_id: data.unit_id,
    expires_at: data.expires_at,
    building_label:
      data.buildings?.name || data.buildings?.address || data.building_id,
    unit_label: data.units?.label || data.units?.unit_number || null,
  };
}

async function getPendingInvitesForEmail(email) {
  const nowIso = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from('invitations')
    .select('id, role, building_id, unit_id, expires_at')
    .eq('email_norm', normalizeEmail(email))
    .eq('status', 'pending')
    .gt('expires_at', nowIso)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message || 'Failed to load pending invites.');
  }

  return data || [];
}

async function cancelOtherPendingInvites(email, chosenInviteId, userId) {
  const { error } = await supabaseAdmin
    .from('invitations')
    .update({
      status: 'cancelled',
      accepted_by: userId,
    })
    .eq('email_norm', normalizeEmail(email))
    .eq('status', 'pending')
    .neq('id', chosenInviteId);

  if (error) {
    throw new Error(error.message || 'Failed to cancel other invites.');
  }
}

async function applyInviteToUser({ userId, email, fullName, invite }) {
  const normalizedEmail = normalizeEmail(email);

  if (!invite) {
    throw new Error('Invite is required to apply invited signup.');
  }

  const role = invite.role;
  const buildingId = invite.building_id;
  const unitId = role === 'manager' ? null : invite.unit_id;

  const { error: profileError } = await supabaseAdmin
    .from('user_profiles')
    .upsert(
      [
        {
          id: userId,
          email: normalizedEmail,
          full_name: fullName,
          role,
          building_id: buildingId,
          unit_id: unitId,
        },
      ],
      { onConflict: 'id' }
    );

  if (profileError) {
    throw new Error(profileError.message || 'Failed to upsert profile.');
  }

  if (role === 'manager') {
    const { error: managerErr } = await supabaseAdmin
      .from('manager_buildings')
      .insert([
        {
          user_id: userId,
          building_id: buildingId,
        },
      ]);

    if (managerErr && managerErr.code !== '23505') {
      throw new Error(
        managerErr.message || 'Failed to attach manager to building.'
      );
    }
  } else {
    const { error: membershipErr } = await supabaseAdmin
      .from('unit_memberships')
      .insert([
        {
          user_id: userId,
          unit_id: invite.unit_id,
          role,
        },
      ]);

    if (membershipErr && membershipErr.code !== '23505') {
      throw new Error(
        membershipErr.message || 'Failed to attach user to unit.'
      );
    }
  }

  const { error: acceptErr } = await supabaseAdmin
    .from('invitations')
    .update({
      status: 'accepted',
      accepted_at: new Date().toISOString(),
      accepted_by: userId,
    })
    .eq('id', invite.invite_id)
    .eq('status', 'pending');

  if (acceptErr) {
    throw new Error(acceptErr.message || 'Failed to mark invite as accepted.');
  }
}

function buildInviteAcceptUrl(token) {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    process.env.APP_URL;

  if (!siteUrl) {
    throw new Error(
      'NEXT_PUBLIC_SITE_URL or SITE_URL or APP_URL must be configured.'
    );
  }

  return `${siteUrl.replace(/\/$/, '')}/invite/accept?token=${encodeURIComponent(
    token
  )}`;
}

async function sendInviteEmail({
  email,
  role,
  buildingLabel,
  unitLabel,
  token,
  expiresAt,
}) {
  const inviteUrl = buildInviteAcceptUrl(token);
  const safeRole = String(role || '').trim();
  const safeBuilding = buildingLabel || 'your building';
  const safeUnit =
    safeRole === 'manager' ? '' : unitLabel ? ` Unit: ${unitLabel}.` : '';
  const expiryText = expiresAt
    ? `This invite expires on ${new Date(expiresAt).toLocaleString()}.`
    : '';

  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'You have been invited to MyStrataApp',
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <h2>You have been invited</h2>
        <p>You were invited to join <strong>${safeBuilding}</strong> as a <strong>${safeRole}</strong>.</p>
        <p>${safeUnit}</p>
        <p>${expiryText}</p>
        <p>
          <a
            href="${inviteUrl}"
            style="display:inline-block;padding:10px 16px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;"
          >
            Accept invitation
          </a>
        </p>
        <p>If the button does not work, copy and paste this URL into your browser:</p>
        <p>${inviteUrl}</p>
      </div>
    `,
  });

  if (error) {
    throw new Error(error.message || 'Failed to send invite email.');
  }
}

router.get('/resolve-invite', async (req, res) => {
  try {
    const token = String(req.query?.token || '').trim();

    if (!token) {
      return res.status(400).json({ error: 'Invite token is required.' });
    }

    const invite = await resolvePendingInviteByToken(token);

    if (!invite) {
      return res.status(404).json({ error: 'Invalid or expired invite link.' });
    }

    const exists = await checkAccountExists(invite.email);

    return res.status(200).json({
      ok: true,
      invite: {
        invite_id: invite.invite_id,
        email: invite.email,
        role: invite.role,
        building_id: invite.building_id,
        unit_id: invite.unit_id,
        building_label: invite.building_label || null,
        unit_label: invite.unit_label || null,
        unit_number: invite.unit_number || null,
        expires_at: invite.expires_at,
        existing_account: exists,
      },
    });
  } catch (err) {
    return res.status(500).json({
      error: err.message || 'Failed to resolve invite.',
    });
  }
});

router.post('/send-invite-email', async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email || '');
    const role = String(req.body?.role || '')
      .trim()
      .toLowerCase();
    const buildingLabel = String(req.body?.building_label || '').trim() || null;
    const unitLabel = String(req.body?.unit_label || '').trim() || null;
    const token = String(req.body?.token || '').trim();
    const expiresAt = req.body?.expires_at || null;

    if (!email || !role || !token) {
      return res.status(400).json({
        error: 'email, role, and token are required.',
      });
    }

    await sendInviteEmail({
      email,
      role,
      buildingLabel,
      unitLabel,
      token,
      expiresAt,
    });

    return res.status(200).json({
      ok: true,
      message: 'Invite email sent.',
    });
  } catch (err) {
    return res.status(500).json({
      error: err.message || 'Failed to send invite email.',
    });
  }
});

router.post('/request-signup-code', async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email || '');
    const password = String(req.body?.password || '');
    const full_name = String(req.body?.full_name || '').trim();
    const requestedRole = String(req.body?.role || '')
      .trim()
      .toLowerCase();
    const inviteToken = String(req.body?.invite_token || '').trim();
    const inviteId = String(req.body?.invite_id || '').trim();

    if (!email || !password || !full_name) {
      return res.status(400).json({
        error: 'Email, password, and full_name are required.',
      });
    }

    let effectiveRole = requestedRole;

    if (inviteToken) {
      const invite = await resolvePendingInviteByToken(inviteToken);

      if (!invite) {
        return res.status(400).json({
          error: 'Invalid or expired invite link.',
        });
      }

      if (normalizeEmail(invite.email) !== email) {
        return res.status(400).json({
          error: 'Invite email does not match the provided email.',
        });
      }

      effectiveRole = invite.role;
    } else if (inviteId) {
      const invite = await resolvePendingInviteById(inviteId, email);

      if (!invite) {
        return res.status(400).json({
          error: 'Selected invitation is invalid or expired.',
        });
      }

      effectiveRole = invite.role;
    } else {
      return res.status(400).json({
        error: 'An invitation is required to create an account.',
      });
    }

    const allowedRoles = ['manager', 'owner', 'tenant', 'admin'];
    if (!allowedRoles.includes(effectiveRole)) {
      return res.status(400).json({ error: 'Invalid role.' });
    }

    if (password.length < 8) {
      return res
        .status(400)
        .json({ error: 'Password must be at least 8 characters long.' });
    }

    const exists = await checkAccountExists(email);

    if (exists) {
      return res.status(400).json({
        error: 'An account with this email already exists.',
      });
    }

    const code = generateSixDigitCode();
    const codeHash = hashCode(email, code);
    const expiresAt = expiryDate();

    const ip =
      req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      null;

    const userAgent = req.headers['user-agent'] || null;

    await supabaseAdmin
      .from('email_verifications')
      .delete()
      .eq('email', email)
      .is('used_at', null);

    const { error: insertError } = await supabaseAdmin
      .from('email_verifications')
      .insert([
        {
          email,
          code_hash: codeHash,
          expires_at: expiresAt,
          ip,
          user_agent: userAgent,
        },
      ]);

    if (insertError) {
      return res.status(500).json({ error: insertError.message });
    }

    const { error: resendError } = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Your verification code',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5;">
          <h2>Verify your email</h2>
          <p>This code will finish creating your invited account.</p>
          <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px;">
            ${code}
          </p>
          <p>This code expires in ${OTP_TTL_MINUTES} minutes.</p>
        </div>
      `,
    });

    if (resendError) {
      return res.status(500).json({
        error: resendError.message || 'Failed to send verification email.',
      });
    }

    return res.status(200).json({
      ok: true,
      message: 'Verification code sent.',
      role: effectiveRole,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Server error.' });
  }
});

router.post('/register', async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email || '');
    const password = String(req.body?.password || '');
    const full_name = String(req.body?.full_name || '').trim();
    const requestedRole = String(req.body?.role || '')
      .trim()
      .toLowerCase();
    const code = String(req.body?.code || '').trim();
    const inviteToken = String(req.body?.invite_token || '').trim();
    const inviteId = String(req.body?.invite_id || '').trim();

    if (!email || !password || !full_name || !code) {
      return res.status(400).json({
        error: 'Email, password, full_name, and code are required.',
      });
    }

    let effectiveRole = requestedRole;
    let invite = null;

    if (inviteToken) {
      invite = await resolvePendingInviteByToken(inviteToken);

      if (!invite) {
        return res.status(400).json({
          error: 'Invalid or expired invite link.',
        });
      }

      if (normalizeEmail(invite.email) !== email) {
        return res.status(400).json({
          error: 'Invite email does not match the provided email.',
        });
      }

      effectiveRole = invite.role;
    } else if (inviteId) {
      invite = await resolvePendingInviteById(inviteId, email);

      if (!invite) {
        return res.status(400).json({
          error: 'Selected invitation is invalid or expired.',
        });
      }

      effectiveRole = invite.role;
    } else {
      const pendingInvites = await getPendingInvitesForEmail(email);

      if (pendingInvites.length !== 1) {
        return res.status(400).json({
          error: 'A specific invitation is required to complete registration.',
        });
      }

      invite = {
        invite_id: pendingInvites[0].id,
        email,
        role: pendingInvites[0].role,
        building_id: pendingInvites[0].building_id,
        unit_id: pendingInvites[0].unit_id,
        expires_at: pendingInvites[0].expires_at,
      };

      effectiveRole = invite.role;
    }

    const allowedRoles = ['manager', 'owner', 'tenant', 'admin'];
    if (!allowedRoles.includes(effectiveRole)) {
      return res.status(400).json({ error: 'Invalid role.' });
    }

    if (password.length < 8) {
      return res
        .status(400)
        .json({ error: 'Password must be at least 8 characters long.' });
    }

    const codeHash = hashCode(email, code);
    const nowIso = new Date().toISOString();

    const { data: verification, error: verificationError } = await supabaseAdmin
      .from('email_verifications')
      .select('*')
      .eq('email', email)
      .eq('code_hash', codeHash)
      .is('used_at', null)
      .gt('expires_at', nowIso)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (verificationError) {
      return res.status(500).json({ error: verificationError.message });
    }

    if (!verification) {
      return res.status(400).json({ error: 'Invalid or expired code.' });
    }

    const exists = await checkAccountExists(email);

    if (exists) {
      return res.status(400).json({
        error: 'An account with this email already exists.',
      });
    }

    const { data: createdUser, error: createUserError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name,
          role: effectiveRole,
        },
      });

    if (createUserError) {
      return res.status(500).json({ error: createUserError.message });
    }

    const userId = createdUser?.user?.id;

    if (!userId) {
      return res.status(500).json({ error: 'Failed to create user.' });
    }

    await applyInviteToUser({
      userId,
      email,
      fullName: full_name,
      invite,
    });

    await cancelOtherPendingInvites(email, invite.invite_id, userId);

    const { error: markUsedError } = await supabaseAdmin
      .from('email_verifications')
      .update({ used_at: nowIso })
      .eq('id', verification.id);

    if (markUsedError) {
      return res.status(500).json({ error: markUsedError.message });
    }

    return res.status(201).json({
      ok: true,
      user: {
        id: userId,
        email,
        full_name,
        role: effectiveRole,
        invited: true,
        building_id: invite?.building_id || null,
        unit_id: invite?.unit_id || null,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Server error.' });
  }
});

module.exports = router;
