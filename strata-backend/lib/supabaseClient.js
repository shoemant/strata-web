/**
 * supabaseClient.js
 * 
 * This file initializes the Supabase client instance, allowing the rest of the application 
 * to securely interact with the Supabase backend (e.g., authentication, database operations).
 * 
 * - Uses environment variables for the Supabase URL and public anonymous key.
 * - Loads environment variables using `dotenv` to keep credentials out of source code.
 * - The `supabase` instance can be imported and used throughout the project.
 * 
 * Environment Variables Required:
 * - SUPABASE_URL:       Supabase project URL 
 * - SUPABASE_ANON_KEY:  Supabase project's public anonymous key
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);
