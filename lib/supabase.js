import { createClient } from '@supabase/supabase-js';

// Keep authentication scoped to this browser tab. Refreshing the page keeps the
// session, while closing the tab/browser requires a fresh login.
export const supabase = createClient(
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
