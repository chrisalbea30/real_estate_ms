'use server'

import { revalidatePath } from 'next/cache'
import { requirePerm, type AppContext } from '@/lib/context'
import { createServerSupabase } from '@/lib/supabase/server'
import { run, must, mustOk, type ActionResult } from '@/lib/actions'
import { complaintSchema, type ComplaintInput } from '@/lib/schemas/complaints'
import { todayIn } from '@/lib/format'
import type { Complaint } from '@/lib/types'

function refresh() {
  revalidatePath('/app/complaints')
}

function userName(ctx: AppContext) {
  const m = ctx.memberships.find((x) => x.organization_id === ctx.org.id)
  return ctx.profile?.full_name || m?.display_name || ctx.email
}

export async function saveComplaintAction(input: ComplaintInput): Promise<ActionResult<Complaint>> {
  return run(async () => {
    const data = complaintSchema.parse(input)
    const ctx = await requirePerm('complaints', data.id ? 'edit' : 'add')
    const supabase = await createServerSupabase()
    const today = todayIn(ctx.property.timezone)

    // Resolve the room number from the chosen room (must belong to this property).
    let room: { id: string; number: number } | null = null
    if (data.room_id) {
      room = must(await supabase.from('rooms').select('id, number').eq('id', data.room_id).eq('property_id', ctx.property.id).single(), 'Room') as { id: string; number: number }
    }

    const done = data.status === 'Resolved' || data.status === 'Closed'
    const payload = {
      date: data.date,
      guest_name: data.guest_name,
      room_id: room?.id ?? null,
      room: room?.number ?? null,
      category: data.category?.trim() || null,
      description: data.description,
      severity: data.severity,
      status: data.status,
      resolution_notes: data.resolution_notes?.trim() || null,
      // Auto-set when the complaint is resolved or closed without a date.
      resolved_at: done ? data.resolved_at || today : data.resolved_at || null,
      filed_by: data.filed_by?.trim() || userName(ctx),
    }

    const row = data.id
      ? must(await supabase.from('complaints').update(payload).eq('id', data.id).eq('organization_id', ctx.org.id).select().single(), 'Update complaint')
      : must(await supabase.from('complaints').insert({ ...payload, organization_id: ctx.org.id, property_id: ctx.property.id }).select().single(), 'Create complaint')
    refresh()
    return row as Complaint
  })
}

export async function deleteComplaintAction(id: string): Promise<ActionResult<undefined>> {
  return run(async () => {
    const ctx = await requirePerm('complaints', 'delete')
    const supabase = await createServerSupabase()
    mustOk(await supabase.from('complaints').delete().eq('id', id).eq('organization_id', ctx.org.id))
    refresh()
    return undefined
  })
}
