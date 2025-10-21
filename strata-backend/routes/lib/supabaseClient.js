/**
 * supabaseClient.js
 *
 * This file initializes the Supabase client instance, allowing the rest of the application
 * to securely interact with the Supabase backend (e.g., authentication, database operations).
 *
 * - Uses environment variables to keep credentials secure and out of source code.
 * - The exported `supabase` instance can be imported and reused across the project.
 *
 * Environment Variables Required:
 * - SUPABASE_URL:             The URL of your Supabase project (e.g., https://xyzcompany.supabase.co)
 * - SUPABASE_SERVICE_ROLE_KEY: The service role key with elevated privileges. This should be used on the backend only.
 *
 * Important:
 * Do not expose the SERVICE_ROLE_KEY to the client. This file must only be used in server-side/backend code.
 */

const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables from .env file
dotenv.config();

// Initialize Supabase client with service role key (backend only)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Export the client for use in backend modules
module.exports = { supabase };