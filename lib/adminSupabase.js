import { createClient } from '@supabase/supabase-js';

// Admin access is intentionally tab-scoped. Team accounts keep the normal
// persistent client, while the admin session ends when this browser tab closes.
export const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      storage: typeof window !== 'undefined' ? window.sessionStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);
