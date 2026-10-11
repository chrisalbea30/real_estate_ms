import 'server-only'
import { createServerSupabase } from '@/lib/supabase/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { BUCKET } from '@/lib/storage'
import { planOf, seatLimit, seatsUsed, type Plan } from '@/lib/plans'
import type { AppContext } from '@/lib/context'

export interface WorkspaceUsage {
  plan: Plan
  extraSeats: number
  members: number
  pendingInvitations: number
  seatsUsed: number
  seatLimit: number | null
  properties: number
  propertyLimit: number | null
  rooms: number
}

/** People, properties and rooms used by the current workspace against its plan. */
export async function getWorkspaceUsage(ctx: AppContext): Promise<WorkspaceUsage> {
  const supabase = await createServerSupabase()
  const now = new Date().toISOString()
  const [members, invites, rooms] = await Promise.all([
    supabase.from('memberships').select('id', { count: 'exact', head: true }).eq('organization_id', ctx.org.id),
    supabase.from('invitations').select('id', { count: 'exact', head: true }).eq('organization_id', ctx.org.id).eq('status', 'pending').gt('expires_at', now),
    supabase.from('rooms').select('id', { count: 'exact', head: true }).eq('organization_id', ctx.org.id).eq('active', true),
  ])
  const plan = planOf(ctx.org.plan)
  const extraSeats = Number((ctx.org as { extra_seats?: number | null }).extra_seats ?? 0)
  const m = members.count ?? 0
  const p = invites.count ?? 0
  return {
    plan,
    extraSeats,
    members: m,
    pendingInvitations: p,
    seatsUsed: seatsUsed(m, p),
    seatLimit: seatLimit(plan, extraSeats),
    properties: ctx.properties.filter((x) => x.active).length,
    propertyLimit: plan.properties,
    rooms: rooms.count ?? 0,
  }
}

/** Bytes and file count stored under this workspace's folder. Uses the service key (listing only). */
export async function getStorageUsage(orgId: string): Promise<{ bytes: number; files: number } | null> {
  try {
    const admin = createAdminSupabase()
    const root = `org/${orgId}`
    const { data: folders, error } = await admin.storage.from(BUCKET).list(root, { limit: 100 })
    if (error) return null
    let bytes = 0
    let files = 0
    await Promise.all(
      (folders ?? []).map(async (f) => {
        if (f.id) {
          bytes += Number(f.metadata?.size ?? 0)
          files++
          return
        }
        for (let offset = 0; offset < 20000; offset += 1000) {
          const { data } = await admin.storage.from(BUCKET).list(`${root}/${f.name}`, { limit: 1000, offset })
          if (!data || data.length === 0) break
          for (const o of data) {
            if (!o.id) continue
            bytes += Number(o.metadata?.size ?? 0)
            files++
          }
          if (data.length < 1000) break
        }
      }),
    )
    return { bytes, files }
  } catch {
    return null
  }
}
