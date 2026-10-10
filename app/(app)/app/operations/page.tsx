import type { Metadata } from 'next'
import { pageContext } from '@/lib/page'
import { createServerSupabase } from '@/lib/supabase/server'
import { OperationsClient, type OpsExpense, type OpsExtinguisher, type OpsGuest, type OpsRevenue, type OpsTask } from '@/components/operations/OperationsClient'
import type { AccountBalance } from '@/lib/types'

export const metadata: Metadata = { title: 'Operations' }

export default async function OperationsPage() {
  const ctx = await pageContext('gm_dashboard')
  const supabase = await createServerSupabase()

  // Everything is fetched in full (no 30/50-row caps): the month revenue, the
  // "no invoice" total and the receivables are sums over whole tables.
  const [guests, todos, revenue, accounts, expenses, extinguishers] = await Promise.all([
    supabase
      .from('guests')
      .select('id, room, room_id, guest_name, guest_count, check_in, check_out, amount_thb_stay, payment, tm30, booking_source, phone')
      .eq('property_id', ctx.property.id)
      .order('check_in'),
    supabase
      .from('todos')
      .select('id, topic, project, department, responsible_person, target_date, status, status_notes')
      .eq('organization_id', ctx.org.id)
      .order('target_date', { ascending: true, nullsFirst: false }),
    supabase.from('revenue').select('amount_thb, date, type').eq('organization_id', ctx.org.id),
    supabase.from('account_balances_v').select('*').eq('organization_id', ctx.org.id).eq('active', true).order('sort'),
    supabase.from('expenses').select('id, amount_base, amount, currency, payment_date, category, supplier, document_number, file_url').eq('organization_id', ctx.org.id),
    // The to-one relation is embedded as an object (handled as such in the client).
    supabase.from('room_fire_extinguishers').select('*, rooms(name, number)').eq('property_id', ctx.property.id).order('expiry_date'),
  ])

  return (
    <OperationsClient
      guests={(guests.data ?? []) as OpsGuest[]}
      todos={(todos.data ?? []) as OpsTask[]}
      revenue={(revenue.data ?? []) as OpsRevenue[]}
      accounts={(accounts.data ?? []) as AccountBalance[]}
      expenses={(expenses.data ?? []) as OpsExpense[]}
      extinguishers={(extinguishers.data ?? []) as unknown as OpsExtinguisher[]}
    />
  )
}
