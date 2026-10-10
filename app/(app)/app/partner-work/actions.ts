'use server'

import { revalidatePath } from 'next/cache'
import { requirePerm } from '@/lib/context'
import { createServerSupabase } from '@/lib/supabase/server'
import { run, must, mustOk, type ActionResult } from '@/lib/actions'
import { workSchema, type WorkInput } from '@/lib/schemas/partners'
import { num } from '@/lib/schemas/guests'
import type { PartnerWork } from '@/lib/types'

function refresh() {
  revalidatePath('/app/partner-work')
  revalidatePath('/app/partner-dashboard')
}

export async function saveWorkAction(input: WorkInput): Promise<ActionResult<PartnerWork>> {
  return run(async () => {
    const data = workSchema.parse(input)
    const ctx = await requirePerm('shareholder_work', data.id ? 'edit' : 'add')
    const supabase = await createServerSupabase()

    const partner = must(await supabase.from('shareholders').select('id, name, hour_rate').eq('id', data.shareholder_id).eq('organization_id', ctx.org.id).single(), 'Partner')

    // Rate precedence: entered → partner's rate → organisation default.
    const rate = num(data.hour_rate) ?? partner.hour_rate ?? Number(ctx.org.settings.partner_hour_rate ?? 0)

    const payload = {
      month: data.month,
      shareholder: partner.name,
      shareholder_id: partner.id,
      hours: data.hours,
      hour_rate: rate,
    }

    const row = data.id
      ? must(await supabase.from('shareholder_work').update(payload).eq('id', data.id).eq('organization_id', ctx.org.id).select().single(), 'Update work record')
      : must(await supabase.from('shareholder_work').insert({ ...payload, organization_id: ctx.org.id }).select().single(), 'Create work record')
    refresh()
    return row as PartnerWork
  })
}

export async function deleteWorkAction(id: string): Promise<ActionResult<undefined>> {
  return run(async () => {
    const ctx = await requirePerm('shareholder_work', 'delete')
    const supabase = await createServerSupabase()
    mustOk(await supabase.from('shareholder_work').delete().eq('id', id).eq('organization_id', ctx.org.id))
    refresh()
    return undefined
  })
}
