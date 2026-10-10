import { createClient } from '@supabase/supabase-js';

// Client creation belongs at request time; importing an API must not require secrets.
export function getBrowserSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Browser database credentials are not configured');
  return createClient(url, key);
}

// Server-side (service role key) - use in API routes only
export function getServiceSupabase() {
  if (typeof window !== 'undefined') {
    throw new Error('Service database access is server-only');
  }
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl || !serviceKey) {
    throw new Error('Server database credentials are not configured');
  }
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
