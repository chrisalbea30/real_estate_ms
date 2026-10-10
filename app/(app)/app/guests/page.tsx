import type { Metadata } from 'next'
import { pageContext } from '@/lib/page'
import { createServerSupabase } from '@/lib/supabase/server'
import { fetchAll } from '@/lib/supabase/fetchAll'
import { GuestsClient } from '@/components/guests/GuestsClient'
import type { Guest, Invoice } from '@/lib/types'

export const metadata: Metadata = { title: 'Guests' }

type InvoiceLite = Pick<Invoice, 'id' | 'guest_id' | 'number' | 'public_token' | 'status' | 'total' | 'balance_due'>

export default async function GuestsPage() {
  const ctx = await pageContext('guests')
  const supabase = await createServerSupabase()
  const [guests, invoices] = await Promise.all([
    fetchAll<Guest>((from, to) => supabase.from('guests').select('*').eq('property_id', ctx.property.id).order('check_in', { ascending: false }).order('id').range(from, to)),
    fetchAll<InvoiceLite>((from, to) =>
      supabase.from('invoices').select('id, guest_id, number, public_token, status, total, balance_due').eq('property_id', ctx.property.id).eq('status', 'issued').order('created_at').range(from, to),
    ),
  ])
  return <GuestsClient guests={guests} invoices={invoices} />
}
