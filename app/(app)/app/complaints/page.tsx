import type { Metadata } from 'next'
import { pageContext } from '@/lib/page'
import { createServerSupabase } from '@/lib/supabase/server'
import { ComplaintsClient } from '@/components/complaints/ComplaintsClient'
import type { Complaint } from '@/lib/types'

export const metadata: Metadata = { title: 'Complaints' }

export default async function ComplaintsPage() {
  const ctx = await pageContext('complaints')
  const supabase = await createServerSupabase()
  const { data } = await supabase
    .from('complaints')
    .select('*')
    .eq('property_id', ctx.property.id)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(3000)
  return <ComplaintsClient complaints={(data ?? []) as Complaint[]} />
}
