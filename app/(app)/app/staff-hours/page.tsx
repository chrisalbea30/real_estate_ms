import type { Metadata } from 'next'
import { pageContext } from '@/lib/page'
import { createServerSupabase } from '@/lib/supabase/server'
import { StaffHoursClient } from '@/components/staff-hours/StaffHoursClient'
import type { StaffHour } from '@/lib/types'

export const metadata: Metadata = { title: 'Staff hours' }

export default async function StaffHoursPage() {
  const ctx = await pageContext('staff_hours')
  const supabase = await createServerSupabase()
  const { data } = await supabase
    .from('staff_hours')
    .select('*')
    .eq('organization_id', ctx.org.id)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(3000)
  return <StaffHoursClient rows={(data ?? []) as StaffHour[]} />
}
