/**
 * supabaseClient.js (Frontend)
 * 
 * Initializes a Supabase client instance for use within the frontend React app.
 * 
 * This allows the client to:
 * - Sign in and register users using Supabase Auth
 * - Read/write to the Supabase database (with Row Level Security enabled)
 * - Subscribe to real-time changes (optional)
 * 
 * Environment variables (defined in your `.env` file):
 * - VITE_SUPABASE_URL:      The URL of your Supabase project
 * - VITE_SUPABASE_ANON_KEY: The public anonymous key for your Supabase instance
 * 
 * These must begin with `VITE_` to be exposed to the frontend by Vite.
 */

import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
