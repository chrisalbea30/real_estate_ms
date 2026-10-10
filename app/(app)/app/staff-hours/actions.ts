'use server'

import { revalidatePath } from 'next/cache'
import { requirePerm } from '@/lib/context'
import { createServerSupabase } from '@/lib/supabase/server'
import { run, must, mustOk, type ActionResult } from '@/lib/actions'
import { staffHourSchema, type StaffHourInput } from '@/lib/schemas/staff-hours'
import { num } from '@/lib/schemas/guests'
import type { StaffHour } from '@/lib/types'

function refresh() {
  revalidatePath('/app/staff-hours')
}

export async function saveStaffHourAction(input: StaffHourInput): Promise<ActionResult<StaffHour>> {
  return run(async () => {
    const data = staffHourSchema.parse(input)
    const ctx = await requirePerm('staff_hours', data.id ? 'edit' : 'add')
    const supabase = await createServerSupabase()

    const payload = {
      staff_name: data.staff_name,
      date: data.date,
      hours: data.hours,
      role: data.role?.trim() || null,
      department: data.department?.trim() || null,
      hourly_rate_thb: num(data.hourly_rate_thb),
      notes: data.notes?.trim() || null,
    }

    const row = data.id
      ? must(await supabase.from('staff_hours').update(payload).eq('id', data.id).eq('organization_id', ctx.org.id).select().single(), 'Update entry')
      : must(await supabase.from('staff_hours').insert({ ...payload, organization_id: ctx.org.id, property_id: ctx.property.id }).select().single(), 'Add entry')
    refresh()
    return row as StaffHour
  })
}

export async function deleteStaffHourAction(id: string): Promise<ActionResult<undefined>> {
  return run(async () => {
    const ctx = await requirePerm('staff_hours', 'delete')
    const supabase = await createServerSupabase()
    mustOk(await supabase.from('staff_hours').delete().eq('id', id).eq('organization_id', ctx.org.id))
    refresh()
    return undefined
  })
}
