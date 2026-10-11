import type { Metadata } from 'next'
import { pageContext } from '@/lib/page'
import { createServerSupabase } from '@/lib/supabase/server'
import { TeamClient, type TeamMember, type RoleLite } from '@/components/settings/TeamClient'
import type { Invitation } from '@/lib/types'
import { getWorkspaceUsage } from '@/lib/usage'
import { SHOW_PRICING } from '@/lib/plans'

export const metadata: Metadata = { title: 'People' }

export default async function TeamSettingsPage({ searchParams }: { searchParams: Promise<{ invite?: string }> }) {
  const ctx = await pageContext('settings')
  const [usage, sp] = await Promise.all([getWorkspaceUsage(ctx), searchParams])
  const supabase = await createServerSupabase()
  const [members, roles, invitations] = await Promise.all([
    supabase
      .from('memberships')
      .select('id, user_id, role_id, status, display_name, created_at, profiles:profiles!memberships_profile_fkey(full_name, email)')
      .eq('organization_id', ctx.org.id)
      .order('created_at'),
    supabase.from('org_roles').select('id, name, is_system').eq('organization_id', ctx.org.id).order('is_system', { ascending: false }).order('name'),
    supabase.from('invitations').select('*').eq('organization_id', ctx.org.id).order('created_at', { ascending: false }).limit(200),
  ])

  type Row = {
    id: string
    user_id: string
    role_id: string
    status: 'active' | 'suspended'
    display_name: string | null
    created_at: string
    profiles: { full_name: string | null; email: string | null } | { full_name: string | null; email: string | null }[] | null
  }
  const team: TeamMember[] = ((members.data ?? []) as Row[]).map((m) => {
    const p = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles
    return {
      id: m.id,
      user_id: m.user_id,
      role_id: m.role_id,
      status: m.status,
      name: m.display_name || p?.full_name || p?.email || 'Member',
      email: p?.email ?? '',
      created_at: m.created_at,
    }
  })

  return <TeamClient members={team} roles={(roles.data ?? []) as RoleLite[]} invitations={(invitations.data ?? []) as Invitation[]} currentUserId={ctx.userId} seats={{ used: usage.seatsUsed, limit: usage.seatLimit }} planName={SHOW_PRICING ? usage.plan.name : ''} openInvite={sp.invite === '1'} />
}
