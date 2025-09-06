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
        return res.status(400).json({
            exists: false,
            role: null,
            invite: null,
            error: 'Email is required',
        });
    }

    const emailLower = email.toLowerCase();

    try {
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

        return res.json({
            exists: data.exists,
            role: data.exists ? 'existing' : null,
            invite: data.invite,
        });
    } catch (err) {
        return res.status(500).json({
            exists: false,
            role: null,
            invite: null,
            error: err.message || 'Server error',
        });
    }
});

module.exports = router;
