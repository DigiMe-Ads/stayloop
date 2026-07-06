import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Server-only. Uses the service role key, which bypasses RLS — never import
// this from a Client Component or expose it to the browser.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_SUPABASE_SERVICE_ROLE!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
