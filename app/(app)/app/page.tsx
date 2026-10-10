import type { Metadata } from 'next'
import { pageContext } from '@/lib/page'
import { createServerSupabase } from '@/lib/supabase/server'
import { todayIn } from '@/lib/format'
import { OverviewClient, type OverviewExpense, type OverviewFunding, type OverviewGuest, type OverviewRevenue, type OverviewTask } from '@/components/overview/OverviewClient'
import type { AccountBalance } from '@/lib/types'

export const metadata: Metadata = { title: 'Overview' }

export default async function OverviewPage() {
  const ctx = await pageContext('overview')
  const supabase = await createServerSupabase()
  const today = todayIn(ctx.property.timezone)

  // Finance tables are organisation-wide; guests belong to the current property.
  // Only stays that have not ended feed the in-house / arriving lists, so
  // departed guests are left out of the payload.
  const [todos, guests, expenses, revenue, founding, accounts] = await Promise.all([
    supabase.from('todos').select('status').eq('organization_id', ctx.org.id),
    supabase
      .from('guests')
      .select('id, room, room_id, guest_name, check_in, check_out, amount_thb_stay, payment')
      .eq('property_id', ctx.property.id)
      .gt('check_out', today)
      .order('check_in'),
    supabase.from('expenses').select('amount, amount_base, currency, payment_date, file_url').eq('organization_id', ctx.org.id),
    supabase.from('revenue').select('amount_thb, date').eq('organization_id', ctx.org.id),
    supabase.from('founding_contributions').select('amount_thb, date').eq('organization_id', ctx.org.id),
    supabase.from('account_balances_v').select('*').eq('organization_id', ctx.org.id).eq('active', true).order('sort'),
  ])

  return (
    <OverviewClient
      todos={(todos.data ?? []) as OverviewTask[]}
      guests={(guests.data ?? []) as OverviewGuest[]}
      expenses={(expenses.data ?? []) as OverviewExpense[]}
      revenue={(revenue.data ?? []) as OverviewRevenue[]}
      founding={(founding.data ?? []) as OverviewFunding[]}
      accounts={(accounts.data ?? []) as AccountBalance[]}
    />
  )
}
