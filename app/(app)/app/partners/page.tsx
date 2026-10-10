import type { Metadata } from 'next'
import { pageContext } from '@/lib/page'
import { createServerSupabase } from '@/lib/supabase/server'
import { fetchAll } from '@/lib/supabase/fetchAll'
import { PartnersClient, type ContributionLite } from '@/components/partners/PartnersClient'
import type { Partner } from '@/lib/types'

export const metadata: Metadata = { title: 'Partners' }

export default async function PartnersPage() {
  const ctx = await pageContext('shareholder_profiles')
  const supabase = await createServerSupabase()
  const [partners, contributions] = await Promise.all([
    supabase.from('shareholders').select('*').eq('organization_id', ctx.org.id).order('name'),
    fetchAll<ContributionLite>((from, to) => supabase.from('founding_contributions').select('shareholder_id, shareholder, amount_thb').eq('organization_id', ctx.org.id).order('id').range(from, to)),
  ])
  return <PartnersClient partners={(partners.data ?? []) as Partner[]} contributions={contributions} />
}
