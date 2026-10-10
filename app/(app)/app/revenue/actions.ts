'use server'

import { revalidatePath } from 'next/cache'
import { AppError, requirePerm } from '@/lib/context'
import { createServerSupabase, type ServerSupabase } from '@/lib/supabase/server'
import { run, must, mustOk, type ActionResult } from '@/lib/actions'
import { revenueSchema, type RevenueInput } from '@/lib/schemas/revenue'
import { num } from '@/lib/schemas/guests'
import type { Revenue } from '@/lib/types'

function refresh() {
  revalidatePath('/app/revenue')
  revalidatePath('/app')
  revalidatePath('/app/legal')
  revalidatePath('/app/partner-dashboard')
  revalidatePath('/app/budget')
  revalidatePath('/app/operations')
}

/** Booking rows are owned by the guests trigger: refuse to touch them here. */
async function assertManual(supabase: ServerSupabase, id: string, orgId: string) {
  const row = must(await supabase.from('revenue').select('id, guest_id').eq('id', id).eq('organization_id', orgId).single(), 'Revenue row')
  if (row.guest_id) throw new AppError('This row comes from a booking. Edit the booking in Guests.')
}

export async function saveRevenueAction(input: RevenueInput): Promise<ActionResult<Revenue>> {
  return run(async () => {
    const data = revenueSchema.parse(input)
    const ctx = await requirePerm('revenue', data.id ? 'edit' : 'add')
    const supabase = await createServerSupabase()
    if (data.id) await assertManual(supabase, data.id, ctx.org.id)

    // guest_id is never sent: manual rows stay manual.
    const payload = {
      date: data.date,
      type: data.type,
      supplier: data.supplier || null,
      amount_thb: num(data.amount_thb) ?? 0,
      notes: data.notes || null,
      file_url: data.file_url || null,
      show_on_legal: data.show_on_legal,
    }

    const row = data.id
      ? must(await supabase.from('revenue').update(payload).eq('id', data.id).eq('organization_id', ctx.org.id).is('guest_id', null).select().single(), 'Update revenue')
      : must(await supabase.from('revenue').insert({ ...payload, organization_id: ctx.org.id, property_id: ctx.property.id }).select().single(), 'Create revenue')
    refresh()
    return row as Revenue
  })
}

export async function deleteRevenueAction(id: string): Promise<ActionResult<undefined>> {
  return run(async () => {
    const ctx = await requirePerm('revenue', 'delete')
    const supabase = await createServerSupabase()
    await assertManual(supabase, id, ctx.org.id)
    mustOk(await supabase.from('revenue').delete().eq('id', id).eq('organization_id', ctx.org.id).is('guest_id', null))
    refresh()
    return undefined
  })
}
