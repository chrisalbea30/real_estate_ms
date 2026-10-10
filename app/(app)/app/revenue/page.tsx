import type { Metadata } from 'next'
import { pageContext } from '@/lib/page'
import { createServerSupabase } from '@/lib/supabase/server'
import { fetchAll } from '@/lib/supabase/fetchAll'
import { RevenueClient, type InvoiceLite } from '@/components/revenue/RevenueClient'
import type { Revenue } from '@/lib/types'

export const metadata: Metadata = { title: 'Revenue' }

export default async function RevenuePage() {
  const ctx = await pageContext('revenue')
  const supabase = await createServerSupabase()
  const [revenue, invoices] = await Promise.all([
    fetchAll<Revenue>((from, to) => supabase.from('revenue').select('*').eq('organization_id', ctx.org.id).order('date', { ascending: false }).order('created_at', { ascending: false }).order('id').range(from, to)),
    // Invoice links for booking rows; empty when the role cannot read invoices.
    fetchAll<InvoiceLite>((from, to) => supabase.from('invoices').select('id, guest_id, number, public_token').eq('organization_id', ctx.org.id).eq('status', 'issued').order('created_at').order('id').range(from, to)),
  ])
  return <RevenueClient revenue={revenue} invoices={invoices} />
}
