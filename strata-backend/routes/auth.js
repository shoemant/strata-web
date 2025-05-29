/**
 * auth.js
 *
 * This Express router handles user authentication routes using Supabase as the backend auth provider.
 *
 * Routes included:
 * - POST /register        → Registers a new user (email, password, full name, role)
 * - POST /login           → Authenticates a user via email and password
 * - POST /reset-password  → Sends a password reset email with a redirect link to the frontend
 *
 * Dependencies:
 * - Requires Supabase client instance (`supabase`) to be initialized and available.
 * - Assumes user metadata is stored under `full_name` and `role` in Supabase Auth.
 *
 * Environment Variables Required (indirectly via Supabase client):
 * - SUPABASE_URL
 * - SUPABASE_ANON_KEY
 *
 * Note:
 * The redirect URL for password reset must be added to your Supabase project's list of allowed redirect URLs.
 */

const express = require('express');
const { supabase } = require('../utils/supabaseClient'); // Adjust path as needed
const router = express.Router();

/**
 * POST /register
 * Registers a new user with Supabase Auth.
 * Stores full_name and role in user_metadata.
 *
 * Request body:
 * {
 *   "email": "user@example.com",
 *   "password": "securepass",
 *   "full_name": "User Name",
 *   "role": "tenant" | "owner" | "manager"
 * }
 */
router.post('/register', async (req, res) => {
  const { email, password, full_name, role } = req.body;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name, role }, // Stored in user_metadata
    },
  });

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  return res.status(201).json({ user: data.user });
});

/**
 * POST /login
 * Authenticates a user via Supabase using email and password.
 *
 * Request body:
 * {
 *   "email": "user@example.com",
 *   "password": "securepass"
 * }
 */
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  return res.status(200).json({ session: data.session, user: data.user });
});

/**
 * POST /reset-password
 * Sends a password reset email via Supabase Auth.
 * The email includes a link redirecting to the frontend's password reset page.
 *
 * Request body:
 * {
 *   "email": "user@example.com"
 * }
 */
router.post('/reset-password', async (req, res) => {
  const { email } = req.body;

  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'http://localhost:3000/update-password', // Update this URL in production
  });

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  return res.status(200).json({ message: 'Reset link sent to email' });
});

module.exports = router;
