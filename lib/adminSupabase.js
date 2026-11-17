import { createClient } from '@supabase/supabase-js';

// Admin sessions intentionally live only in this tab's memory.
// Closing/reloading the tab requires a fresh Gmail + password login.
export const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      flowType: 'pkce',
    },
  }
);
