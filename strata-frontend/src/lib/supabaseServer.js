import { createServerComponentClient } from '@supabase/ssr';

export function createServerSupabase(cookies) {
  return createServerComponentClient({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    cookies,
  });
}
