import type { Metadata } from 'next'
import { pageContext } from '@/lib/page'
import { createServerSupabase } from '@/lib/supabase/server'
import { fetchAll } from '@/lib/supabase/fetchAll'
import { LegalClient, type LegalInvoice } from '@/components/legal/LegalClient'
import type { Expense, Guest, Revenue } from '@/lib/types'

export const metadata: Metadata = { title: 'Legal & accounting' }
export const dynamic = 'force-dynamic'

export default async function LegalPage() {
  const ctx = await pageContext('legal')
  const supabase = await createServerSupabase()
  const [expenses, guests, revenue, invoices] = await Promise.all([
    fetchAll<Expense>((from, to) =>
      supabase.from('expenses').select('*').eq('organization_id', ctx.org.id).eq('is_legal', true).order('payment_date', { ascending: false, nullsFirst: false }).order('id').range(from, to),
    ),
    fetchAll<Guest>((from, to) => supabase.from('guests').select('*').eq('organization_id', ctx.org.id).eq('show_on_legal', true).order('check_out', { ascending: false }).order('id').range(from, to)),
    // Booking revenue is listed through the guest flag, so guest-linked rows are excluded here (never twice).
    fetchAll<Revenue>((from, to) =>
      supabase.from('revenue').select('*').eq('organization_id', ctx.org.id).eq('show_on_legal', true).is('guest_id', null).order('date', { ascending: false }).order('id').range(from, to),
    ),
    // Issued invoices for the invoice links; empty for roles that cannot read invoices.
    fetchAll<LegalInvoice>((from, to) => supabase.from('invoices').select('id, guest_id, number, public_token').eq('organization_id', ctx.org.id).eq('status', 'issued').order('created_at').order('id').range(from, to)),
  ])

  const guestIds = new Set(guests.map((g) => g.id))
  return <LegalClient expenses={expenses} guests={guests} revenue={revenue} invoices={invoices.filter((i) => i.guest_id && guestIds.has(i.guest_id))} />
}
