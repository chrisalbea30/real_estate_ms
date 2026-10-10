'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { ORG_COOKIE, PROPERTY_COOKIE, requireContext } from '@/lib/context'
import { createServerSupabase } from '@/lib/supabase/server'

const COOKIE = { path: '/', httpOnly: true, sameSite: 'lax' as const, maxAge: 60 * 60 * 24 * 365 }

export async function switchOrganizationAction(orgId: string) {
  const ctx = await requireContext()
  if (!ctx.memberships.some((m) => m.organization_id === orgId)) throw new Error('Not a member')
  const cookieStore = await cookies()
  cookieStore.set(ORG_COOKIE, orgId, COOKIE)
  cookieStore.delete(PROPERTY_COOKIE)
  redirect('/app')
}

export async function switchPropertyAction(propertyId: string) {
  const ctx = await requireContext()
  if (!ctx.properties.some((p) => p.id === propertyId)) throw new Error('Unknown property')
  const cookieStore = await cookies()
  cookieStore.set(PROPERTY_COOKIE, propertyId, COOKIE)
  redirect('/app')
}

export async function signOutAction() {
  const supabase = await createServerSupabase()
  await supabase.auth.signOut()
  redirect('/login?notice=signed_out')
}
