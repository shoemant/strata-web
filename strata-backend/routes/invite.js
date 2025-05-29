/**
 * invite.js
 *
 * This Express router handles sending email invitations to new users (owners or tenants).
 * It relies on a SendGrid-powered utility to generate and send a sign-up link via email.
 *
 * Routes included:
 * - POST /invite  → Sends an invitation email to the specified address with a tokenized registration link
 *
 * Dependencies:
 * - `sendInvitationEmail(email, token)` from `lib/sendInvite.js`
 * - Supabase token system to verify/accept invitations on the frontend
 *
 * Notes:
 * - The invitation token should already be generated and stored before hitting this route.
 * - The email link sent points to the frontend signup flow with the token as a query parameter.
 */

const express = require('express');
const { sendInvitationEmail } = require('../lib/sendInvite.js');

const router = express.Router();

/**
 * POST /
 * Sends an invitation email with a unique tokenized signup link.
 *
 * Request body:
 * {
 *   "email": "user@example.com",
 *   "token": "unique-token-value"
 * }
 *
 * Response:
 * - 200 OK: Email sent successfully
 * - 400 Bad Request: Missing required parameters
 * - 500 Internal Server Error: Failed to send email
 */
router.post('/', async (req, res) => {
  const { email, token } = req.body;

  // Validate required fields
  if (!email || !token) {
    return res.status(400).json({ error: 'Email and token are required.' });
  }

  try {
    console.log('Sending invitation to', email);
    await sendInvitationEmail(email, token);
    console.log('Email function completed.');
    res.status(200).json({ message: 'Email sent successfully' });
  } catch (err) {
    console.error('SendGrid error:', err.response?.body || err.message);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

module.exports = router;