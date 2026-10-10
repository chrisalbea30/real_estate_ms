import type { Metadata } from 'next'
import { pageContext } from '@/lib/page'
import { createServerSupabase } from '@/lib/supabase/server'
import { RolesClient, type RoleUsage } from '@/components/settings/RolesClient'
import type { OrgRole } from '@/lib/types'

export const metadata: Metadata = { title: 'Roles and permissions' }

export default async function RolesSettingsPage() {
  const ctx = await pageContext('settings')
  const supabase = await createServerSupabase()
  const [roles, members, invites] = await Promise.all([
    supabase.from('org_roles').select('*').eq('organization_id', ctx.org.id).order('is_system', { ascending: false }).order('name'),
    supabase.from('memberships').select('role_id').eq('organization_id', ctx.org.id),
    supabase.from('invitations').select('role_id').eq('organization_id', ctx.org.id).eq('status', 'pending'),
  ])

  const usage: Record<string, RoleUsage> = {}
  for (const m of members.data ?? []) {
    usage[m.role_id] = usage[m.role_id] ?? { members: 0, invites: 0 }
    usage[m.role_id]!.members++
  }
  for (const i of invites.data ?? []) {
    usage[i.role_id] = usage[i.role_id] ?? { members: 0, invites: 0 }
    usage[i.role_id]!.invites++
  }

  return <RolesClient roles={(roles.data ?? []) as OrgRole[]} usage={usage} myRoleId={ctx.role.id} />
}
