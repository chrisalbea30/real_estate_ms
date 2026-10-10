import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { env } from '@/lib/env'
import type { Database } from '@/lib/database.types'

// Server client bound to the request cookies. Used in server components,
// route handlers and server actions. Carries the user's JWT, so RLS applies.
export async function createServerSupabase() {
  const cookieStore = await cookies()
  return createServerClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Called from a Server Component: cookies cannot be written there.
          // The proxy refreshes sessions, so this is safe to ignore.
        }
      },
    },
  })
}

export type ServerSupabase = Awaited<ReturnType<typeof createServerSupabase>>
