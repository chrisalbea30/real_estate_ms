import type { Metadata } from 'next'
import { pageContext } from '@/lib/page'
import { createServerSupabase } from '@/lib/supabase/server'
import { fetchAll } from '@/lib/supabase/fetchAll'
import { PartnerWorkClient, type WorkPartner } from '@/components/partner-work/PartnerWorkClient'
import type { PartnerWork } from '@/lib/types'

export const metadata: Metadata = { title: 'Partner work' }

export default async function PartnerWorkPage() {
  const ctx = await pageContext('shareholder_work')
  const supabase = await createServerSupabase()
  const [rows, partners] = await Promise.all([
    fetchAll<PartnerWork>((from, to) => supabase.from('shareholder_work').select('*').eq('organization_id', ctx.org.id).order('month', { ascending: false }).order('shareholder').order('id').range(from, to)),
    supabase.from('shareholders').select('id, name, hour_rate, active').eq('organization_id', ctx.org.id).order('name'),
  ])
  return <PartnerWorkClient rows={rows} partners={(partners.data ?? []) as WorkPartner[]} />
}
