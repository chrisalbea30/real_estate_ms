'use server'

import { revalidatePath } from 'next/cache'
import { requirePerm } from '@/lib/context'
import { createServerSupabase } from '@/lib/supabase/server'
import { run, must, mustOk, type ActionResult } from '@/lib/actions'
import { partnerSchema, sharePercentageSchema, type PartnerInput, type SharePercentageInput } from '@/lib/schemas/partners'
import { num } from '@/lib/schemas/guests'
import { BUCKET, isExternalUrl } from '@/lib/storage'
import type { Partner } from '@/lib/types'

function refresh() {
  // Partner names live in the shared snapshot loaded by the /app layout.
  revalidatePath('/app', 'layout')
  revalidatePath('/app/partners')
  revalidatePath('/app/founding')
  revalidatePath('/app/partner-work')
  revalidatePath('/app/meetings')
  revalidatePath('/app/partner-dashboard')
  revalidatePath('/app')
}

export async function savePartnerAction(input: PartnerInput): Promise<ActionResult<Partner>> {
  return run(async () => {
    const data = partnerSchema.parse(input)
    const ctx = await requirePerm('shareholder_profiles', data.id ? 'edit' : 'add')
    const supabase = await createServerSupabase()

    // A linked team member must belong to this organisation.
    let userId: string | null = null
    if (data.user_id) {
      const m = must(await supabase.from('memberships').select('user_id').eq('organization_id', ctx.org.id).eq('user_id', data.user_id).maybeSingle(), 'Team member')
      userId = m.user_id
    }

    const payload = {
      name: data.name,
      role: data.role,
      share_percentage: num(data.share_percentage),
      amount_to_found_thb: num(data.amount_to_found_thb),
      hour_rate: num(data.hour_rate),
      bio: data.bio || null,
      photo_url: data.photo_url || null,
      email: data.email || null,
      phone: data.phone || null,
      nationality: data.nationality || null,
      joined_date: data.joined_date || null,
      user_id: userId,
      active: data.active,
    }

    let row: Partner
    if (data.id) {
      const before = must(await supabase.from('shareholders').select('id, name, photo_url').eq('id', data.id).eq('organization_id', ctx.org.id).single(), 'Partner')
      row = must(await supabase.from('shareholders').update(payload).eq('id', data.id).eq('organization_id', ctx.org.id).select().single(), 'Update partner') as Partner

      // Keep the denormalised name on linked rows in step (best effort: the
      // caller may not hold edit rights on those modules).
      if (before.name !== data.name) {
        await supabase.from('founding_contributions').update({ shareholder: data.name }).eq('organization_id', ctx.org.id).eq('shareholder_id', data.id)
        await supabase.from('shareholder_work').update({ shareholder: data.name }).eq('organization_id', ctx.org.id).eq('shareholder_id', data.id)
      }
      if (before.photo_url && before.photo_url !== payload.photo_url && !isExternalUrl(before.photo_url)) {
        await supabase.storage.from(BUCKET).remove([before.photo_url])
      }
    } else {
      row = must(await supabase.from('shareholders').insert({ ...payload, organization_id: ctx.org.id }).select().single(), 'Create partner') as Partner
    }
    refresh()
    return row
  })
}

export async function deletePartnerAction(id: string): Promise<ActionResult<undefined>> {
  return run(async () => {
    const ctx = await requirePerm('shareholder_profiles', 'delete')
    const supabase = await createServerSupabase()
    const before = must(await supabase.from('shareholders').select('id, photo_url').eq('id', id).eq('organization_id', ctx.org.id).single(), 'Partner')
    // Contributions and work rows keep the partner's name; the FK is set to null by the database.
    mustOk(await supabase.from('shareholders').delete().eq('id', id).eq('organization_id', ctx.org.id))
    if (before.photo_url && !isExternalUrl(before.photo_url)) {
      await supabase.storage.from(BUCKET).remove([before.photo_url])
    }
    refresh()
    return undefined
  })
}

/** Inline ownership edit used by the partner dashboard. */
export async function updateSharePercentageAction(input: SharePercentageInput): Promise<ActionResult<undefined>> {
  return run(async () => {
    const data = sharePercentageSchema.parse(input)
    const ctx = await requirePerm('shareholder_profiles', 'edit')
    const supabase = await createServerSupabase()
    mustOk(await supabase.from('shareholders').update({ share_percentage: num(data.share_percentage) }).eq('id', data.id).eq('organization_id', ctx.org.id))
    refresh()
    return undefined
  })
}
