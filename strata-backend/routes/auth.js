/**
 * auth.js
 * 
 * This Express router handles user authentication routes using Supabase as the backend auth provider.
 * 
 * Routes included:
 * - POST /register        → Registers a new user (email, password, full name, role)
 * - POST /login           → Logs in a user using email/password
 * - POST /reset-password  → Sends a password reset email with a redirect link
 * 
 * Each route uses Supabase's built-in auth methods via supabase-js.
 */

import express from 'express';
import { supabase } from '../lib/supabaseClient.js';

const router = express.Router();

/**
 * POST /register
 * Registers a new user with Supabase Auth.
 * Stores `full_name` and `role` in the user's metadata.
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
      data: { full_name, role }  // This gets stored in user_metadata
    }
  });

  if (error) return res.status(400).json({ error: error.message });
  return res.status(201).json({ user: data.user });
});

/**
 * POST /login
 * Authenticates a user with email and password.
 * 
 * Request body:
 * {
 *   "email": "user@example.com",
 *   "password": "securepass"
 * }
 */
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return res.status(400).json({ error: error.message });
  return res.status(200).json({ session: data.session, user: data.user });
});

/**
 * POST /reset-password
 * Sends a password reset email via Supabase Auth.
 * The email includes a redirect link that leads back to the frontend password reset page.
 * 
 * Request body:
 * {
 *   "email": "user@example.com"
 * }
 */
router.post('/reset-password', async (req, res) => {
  const { email } = req.body;

  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'http://localhost:3000/update-password'  // Make sure this exists in frontend
  });

  if (error) return res.status(400).json({ error: error.message });
  return res.status(200).json({ message: 'Reset link sent to email' });
});

export default router;
