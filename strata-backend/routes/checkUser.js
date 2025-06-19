const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

router.post('/', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ exists: false, error: 'Email is required' });
    }

    const emailLower = email.toLowerCase();

    // 1. Check if user exists in auth.users
    const { data: userList, error: userError } = await supabase.auth.admin.listUsers({ email: emailLower });

    if (userError) {
        return res.status(500).json({ exists: false, error: userError.message });
    }

    const existsInAuth = userList?.users?.length > 0;

    // 2. Check for manager invite
    const { data: managerMatch, error: managerError } = await supabase
        .from('manager_buildings')
        .select('id')
        .eq('email', emailLower)
        .is('user_id', null);

    if (managerError) {
        return res.status(500).json({ exists: false, error: managerError.message });
    }

    // 3. Check for tenant/owner invite
    const { data: inviteMatch, error: inviteError } = await supabase
        .from('invitations')
        .select('role')
        .eq('email', emailLower)
        .eq('status', 'pending');

    if (inviteError) {
        return res.status(500).json({ exists: false, error: inviteError.message });
    }

    if (existsInAuth) {
        return res.json({ exists: true, role: 'existing' });
    } else if (managerMatch?.length > 0) {
        return res.json({ exists: false, role: 'manager' });
    } else if (inviteMatch?.length > 0) {
        return res.json({ exists: false, role: inviteMatch[0].role }); // tenant or owner
    }

    return res.json({ exists: false, role: 'none' });
});

module.exports = router;
