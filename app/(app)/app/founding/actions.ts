'use server'

import { revalidatePath } from 'next/cache'
import { requirePerm } from '@/lib/context'
import { createServerSupabase } from '@/lib/supabase/server'
import { run, must, mustOk, type ActionResult } from '@/lib/actions'
import { contributionSchema, type ContributionInput } from '@/lib/schemas/partners'
import { num } from '@/lib/schemas/guests'
import type { FoundingContribution } from '@/lib/types'

function refresh() {
  revalidatePath('/app/founding')
  revalidatePath('/app/partners')
  revalidatePath('/app/partner-dashboard')
  revalidatePath('/app')
}

export async function saveContributionAction(input: ContributionInput): Promise<ActionResult<FoundingContribution>> {
  return run(async () => {
    const data = contributionSchema.parse(input)
    const ctx = await requirePerm('founding', data.id ? 'edit' : 'add')
    const supabase = await createServerSupabase()

    const partner = must(await supabase.from('shareholders').select('id, name').eq('id', data.shareholder_id).eq('organization_id', ctx.org.id).single(), 'Partner')

    const payload = {
      date: data.date,
      method: data.method || null,
      shareholder: partner.name,
      shareholder_id: partner.id,
      amount_thb: data.amount_thb,
      amount_eur: num(data.amount_eur),
      notes: data.notes || null,
    }

    const row = data.id
      ? must(await supabase.from('founding_contributions').update(payload).eq('id', data.id).eq('organization_id', ctx.org.id).select().single(), 'Update contribution')
      : must(await supabase.from('founding_contributions').insert({ ...payload, organization_id: ctx.org.id }).select().single(), 'Create contribution')
    refresh()
    return row as FoundingContribution
  })
}

export async function deleteContributionAction(id: string): Promise<ActionResult<undefined>> {
  return run(async () => {
    const ctx = await requirePerm('founding', 'delete')
    const supabase = await createServerSupabase()
    mustOk(await supabase.from('founding_contributions').delete().eq('id', id).eq('organization_id', ctx.org.id))
    refresh()
    return undefined
  })
}
