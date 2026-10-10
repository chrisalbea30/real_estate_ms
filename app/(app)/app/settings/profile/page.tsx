import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getAppContext } from '@/lib/context'
import { createServerSupabase } from '@/lib/supabase/server'
import { ProfileClient } from '@/components/settings/ProfileClient'

export const metadata: Metadata = { title: 'Your profile' }

/** Open to every member, whatever their settings permission. */
export default async function ProfilePage() {
  const ctx = await getAppContext()
  if (!ctx) redirect('/login?next=/app/settings/profile')
  if ('needsOnboarding' in ctx) redirect('/onboarding')

  const supabase = await createServerSupabase()
  const roleIds = [...new Set(ctx.memberships.map((m) => m.role_id))]
  const { data: roles } = await supabase.from('org_roles').select('id, name').in('id', roleIds)
  const roleName = (id: string) => roles?.find((r) => r.id === id)?.name ?? 'Member'

  const orgs = ctx.memberships.map((m) => ({
    id: m.organization_id,
    name: m.organizations?.name ?? 'Organisation',
    plan: m.organizations?.plan ?? 'trial',
    role: roleName(m.role_id),
    current: m.organization_id === ctx.org.id,
  }))
  const membership = ctx.memberships.find((m) => m.organization_id === ctx.org.id)

  return <ProfileClient email={ctx.email} fullName={ctx.profile?.full_name ?? ''} displayName={membership?.display_name ?? ''} orgs={orgs} />
}
