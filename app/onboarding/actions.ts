'use server'

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { createServerSupabase } from '@/lib/supabase/server'
import { ORG_COOKIE, PROPERTY_COOKIE } from '@/lib/context'
import { run, must, mustOk, type ActionResult } from '@/lib/actions'

const schema = z.object({
  org_name: z.string().trim().min(2, 'Organisation name is required').max(80),
  property_name: z.string().trim().min(1, 'Property name is required').max(80),
  timezone: z.string().trim().min(1),
  currency: z.string().trim().length(3).toUpperCase(),
  vat_rate: z.coerce.number().min(0).max(100).default(0),
  room_count: z.coerce.number().int().min(0).max(200).default(0),
  room_prefix: z.string().trim().max(20).default('Room'),
})

export type OnboardingInput = z.input<typeof schema>

export async function createOrganizationAction(input: OnboardingInput): Promise<ActionResult<{ orgId: string }>> {
  return run(async () => {
    const data = schema.parse(input)
    const supabase = await createServerSupabase()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('Not signed in')

    const orgId = must(
      await supabase.rpc('app_create_organization', {
        p_name: data.org_name,
        p_property_name: data.property_name,
        p_timezone: data.timezone,
        p_currency: data.currency,
        p_settings: { vat_rate: data.vat_rate },
      }),
      'Create organisation',
    ) as string

    const property = must(await supabase.from('properties').select('id').eq('organization_id', orgId).limit(1).single(), 'Property')

    if (data.room_count > 0) {
      const rooms = Array.from({ length: data.room_count }, (_, i) => ({
        organization_id: orgId,
        property_id: property.id,
        number: i + 1,
        name: `${data.room_prefix || 'Room'} ${i + 1}`.trim(),
      }))
      mustOk(await supabase.from('rooms').insert(rooms))
    }

    const cookieStore = await cookies()
    const opts = { path: '/', httpOnly: true, sameSite: 'lax' as const, maxAge: 60 * 60 * 24 * 365 }
    cookieStore.set(ORG_COOKIE, orgId, opts)
    cookieStore.set(PROPERTY_COOKIE, property.id, opts)
    return { orgId }
  })
}

export async function goToApp() {
  redirect('/app')
}
