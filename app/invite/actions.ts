'use server'

import { cookies } from 'next/headers'
import { createServerSupabase } from '@/lib/supabase/server'
import { ORG_COOKIE, PROPERTY_COOKIE } from '@/lib/context'
import { run, must, type ActionResult } from '@/lib/actions'

export async function acceptInvitationAction(token: string): Promise<ActionResult<{ orgId: string }>> {
  return run(async () => {
    const supabase = await createServerSupabase()
    const orgId = must(await supabase.rpc('app_accept_invitation', { p_token: token }), 'Accept invitation') as string
    const cookieStore = await cookies()
    const opts = { path: '/', httpOnly: true, sameSite: 'lax' as const, maxAge: 60 * 60 * 24 * 365 }
    cookieStore.set(ORG_COOKIE, orgId, opts)
    cookieStore.delete(PROPERTY_COOKIE)
    return { orgId }
  })
}
