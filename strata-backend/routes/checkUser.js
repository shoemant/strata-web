// strata-backend/routes/checkUser.js
const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

// Single, long-lived client (service role on the server is OK)
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
                role: null,
                invite: null,
                error: 'Email is required',
            });
        }

        const emailLower = raw.toLowerCase();

        // Call the RPC: public.check_user_status(email_input text)
        const { data, error } = await supabase.rpc('check_user_status', {
            email_input: emailLower,
        });

        if (error) {
            return res.status(500).json({
                exists: false,
                role: null,
                invite: null,
                error: error.message || 'Database error',
            });
        }

        // Supabase returns an object for OUT params; be defensive just in case.
        const exists = !!(data && (data.exists ?? data.user_exists));
        const invite = data?.invite ?? null;

        return res.json({
            exists,
            role: exists ? 'existing' : null,
            invite,
        });
    } catch (err) {
        return res.status(500).json({
            exists: false,
            role: null,
            invite: null,
            error: err?.message || 'Server error',
        });
    }
});

module.exports = router;
