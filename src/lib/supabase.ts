import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Client-side (anon key)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side (service role key) - use in API routes only
export function getServiceSupabase() {
  return createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey);
}
