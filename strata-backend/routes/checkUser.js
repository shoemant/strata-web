const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { persistSession: false, autoRefreshToken: false },
  }
);

router.post('/', async (req, res) => {
  try {
    const raw = (req.body?.email ?? '').trim();
    if (!raw) {
      return res.status(400).json({
        exists: false,
        invites: [],
        inviteCount: 0,
        error: 'Email is required',
      });
    }

    const emailLower = raw.toLowerCase();

    const { data: accountData, error: accountError } = await supabase.rpc(
      'check_email_for_account',
      {
        p_email: emailLower,
      }
    );

    if (accountError) {
      return res.status(500).json({
        exists: false,
        invites: [],
        inviteCount: 0,
        error: accountError.message || 'Database error',
      });
    }

    const exists = !!accountData?.[0]?.account_exists;

    const nowIso = new Date().toISOString();

    const { data: invites, error: inviteError } = await supabase
      .from('invitations')
      .select(
        `
        id,
        role,
        building_id,
        unit_id,
        expires_at,
        buildings(id,name,address),
        units(id,label,unit_number,floor)
      `
      )
      .eq('email_norm', emailLower)
      .eq('status', 'pending')
      .gt('expires_at', nowIso)
      .order('created_at', { ascending: false });

    if (inviteError) {
      return res.status(500).json({
        exists,
        invites: [],
        inviteCount: 0,
        error: inviteError.message || 'Failed to load invites',
      });
    }

    const normalizedInvites = (invites || []).map((inv) => ({
      id: inv.id,
      role: inv.role,
      building_id: inv.building_id,
      unit_id: inv.unit_id,
      expires_at: inv.expires_at,
      building_label:
        inv.buildings?.name || inv.buildings?.address || inv.building_id,
      unit_label: inv.units?.label || inv.units?.unit_number || null,
    }));

    return res.json({
      exists,
      invites: normalizedInvites,
      inviteCount: normalizedInvites.length,
    });
  } catch (err) {
    return res.status(500).json({
      exists: false,
      invites: [],
      inviteCount: 0,
      error: err?.message || 'Server error',
    });
  }
});

module.exports = router;
