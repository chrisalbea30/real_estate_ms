import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'
import type { Database } from '@/lib/database.types'

// Service-role client. Bypasses RLS. Only for server code that has already
// authorised the caller (public invoice links, invitations, FX refresh).
export function createAdminSupabase() {
  if (!env.supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_KEY is not set')
  }
  return createClient<Database>(env.supabaseUrl, env.supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
