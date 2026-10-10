import type { Metadata } from 'next'
import { pageContext } from '@/lib/page'
import { createServerSupabase } from '@/lib/supabase/server'
import { fetchAll } from '@/lib/supabase/fetchAll'
import { FoundingClient, type PartnerLite } from '@/components/founding/FoundingClient'
import type { FoundingContribution } from '@/lib/types'

export const metadata: Metadata = { title: 'Capital' }

export default async function FoundingPage() {
  const ctx = await pageContext('founding')
  const supabase = await createServerSupabase()
  const [contributions, partners] = await Promise.all([
    fetchAll<FoundingContribution>((from, to) => supabase.from('founding_contributions').select('*').eq('organization_id', ctx.org.id).order('date', { ascending: false }).order('id').range(from, to)),
    supabase.from('shareholders').select('id, name, active, share_percentage, amount_to_found_thb').eq('organization_id', ctx.org.id).order('name'),
  ])
  return <FoundingClient contributions={contributions} partners={(partners.data ?? []) as PartnerLite[]} />
}
