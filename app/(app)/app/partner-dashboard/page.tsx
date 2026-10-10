import type { Metadata } from 'next'
import { pageContext } from '@/lib/page'
import { createServerSupabase } from '@/lib/supabase/server'
import { fetchAll } from '@/lib/supabase/fetchAll'
import { PartnerDashboardClient } from '@/components/partner-dashboard/PartnerDashboardClient'
import type { AccountRow, BudgetExpenseRow, BudgetRevenueRow, ContributionRow, DashboardData, ExpenseRow, GuestRow, RevenueRow } from '@/components/partner-dashboard/calc'
import type { Partner } from '@/lib/types'

export const metadata: Metadata = { title: 'Partner dashboard' }

export default async function PartnerDashboardPage() {
  const ctx = await pageContext('shareholder_dashboard')
  const supabase = await createServerSupabase()
  const org = ctx.org.id

  // Budget revenue is matched to the active rooms of this property so imported
  // aggregate rows (e.g. "Total") are not counted twice.
  const rooms = await supabase.from('rooms').select('name, active').eq('property_id', ctx.property.id)
  const roomNames = (rooms.data ?? []).filter((r) => r.active).map((r) => r.name)

  const [expenses, revenue, contributions, accounts, budgetRevenue, budgetExpenses, guests, partners] = await Promise.all([
    fetchAll<ExpenseRow>((from, to) => supabase.from('expenses').select('category, amount, amount_base, currency, payment_date').eq('organization_id', org).order('payment_date').order('id').range(from, to)),
    fetchAll<RevenueRow>((from, to) => supabase.from('revenue').select('amount_thb, date, type').eq('organization_id', org).order('date').order('id').range(from, to)),
    fetchAll<ContributionRow>((from, to) => supabase.from('founding_contributions').select('shareholder_id, shareholder, amount_thb, amount_eur, date').eq('organization_id', org).order('date').order('id').range(from, to)),
    supabase.from('account_balances_v').select('id, name, type, currency, balance, active').eq('organization_id', org).eq('active', true).order('sort'),
    roomNames.length > 0
      ? fetchAll<BudgetRevenueRow>((from, to) => supabase.from('budget_revenue').select('year, month, room_name, amount_thb').eq('organization_id', org).in('room_name', roomNames).order('year').order('month').order('id').range(from, to))
      : Promise.resolve([] as BudgetRevenueRow[]),
    fetchAll<BudgetExpenseRow>((from, to) => supabase.from('budget_expenses').select('year, month, category, item_name, amount_thb, expense_type').eq('organization_id', org).order('year').order('month').order('id').range(from, to)),
    fetchAll<GuestRow>((from, to) => supabase.from('guests').select('id, check_in, check_out, amount_thb_stay, payment, room, room_id, guest_name').eq('property_id', ctx.property.id).order('check_in').order('id').range(from, to)),
    supabase.from('shareholders').select('*').eq('organization_id', org).order('name'),
  ])

  const data: DashboardData = {
    expenses,
    revenue,
    contributions,
    accounts: (accounts.data ?? []) as AccountRow[],
    budgetRevenue,
    budgetExpenses,
    guests,
    partners: (partners.data ?? []) as Partner[],
  }

  return <PartnerDashboardClient data={data} />
}
