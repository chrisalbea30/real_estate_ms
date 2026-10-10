import type { Metadata } from 'next'
import { pageContext } from '@/lib/page'
import { createServerSupabase, type ServerSupabase } from '@/lib/supabase/server'
import { todayIn, yearOf } from '@/lib/format'
import { BudgetClient } from '@/components/budget/BudgetClient'
import type { ActualRevenueRow, ActualExpenseRow } from '@/components/budget/calc'
import type { BudgetRevenue, BudgetExpense, BudgetRent, BudgetRoomSetup } from '@/lib/types'

export const metadata: Metadata = { title: 'Budget' }

const ROW_CAP = 5000

type YearRange = [number | null, number | null]

/** Smallest and largest year found by two single-row queries (ascending and descending) on `column` (a year integer or a date string). */
async function bounds(column: string, lo: PromiseLike<{ data: unknown }>, hi: PromiseLike<{ data: unknown }>): Promise<YearRange> {
  const [a, b] = await Promise.all([lo, hi])
  const pick = (res: { data: unknown }) => {
    const rows = Array.isArray(res.data) ? (res.data as Record<string, unknown>[]) : []
    const v = rows[0]?.[column]
    if (typeof v === 'number') return v
    if (typeof v === 'string') return yearOf(v)
    return null
  }
  return [pick(a), pick(b)]
}

/** The year span of every table that feeds the year selector. */
function yearRanges(supabase: ServerSupabase, orgId: string, propertyId: string): Promise<YearRange>[] {
  const budgetRevenue = (asc: boolean) => supabase.from('budget_revenue').select('year').eq('property_id', propertyId).order('year', { ascending: asc }).limit(1)
  const budgetExpenses = (asc: boolean) => supabase.from('budget_expenses').select('year').eq('property_id', propertyId).order('year', { ascending: asc }).limit(1)
  const roomSetup = (asc: boolean) => supabase.from('budget_room_setup').select('year').eq('property_id', propertyId).order('year', { ascending: asc }).limit(1)
  const revenue = (asc: boolean) => supabase.from('revenue').select('date').eq('organization_id', orgId).not('date', 'is', null).order('date', { ascending: asc }).limit(1)
  const expenses = (asc: boolean) =>
    supabase.from('expenses').select('payment_date').eq('organization_id', orgId).not('payment_date', 'is', null).order('payment_date', { ascending: asc }).limit(1)
  return [
    bounds('year', budgetRevenue(true), budgetRevenue(false)),
    bounds('year', budgetExpenses(true), budgetExpenses(false)),
    bounds('year', roomSetup(true), roomSetup(false)),
    bounds('date', revenue(true), revenue(false)),
    bounds('payment_date', expenses(true), expenses(false)),
  ]
}

export default async function BudgetPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const ctx = await pageContext('budget')
  const supabase = await createServerSupabase()
  const sp = await searchParams
  const today = todayIn(ctx.property.timezone)
  const currentYear = Number(today.slice(0, 4))
  const wanted = Number(sp.year)
  const year = Number.isInteger(wanted) && wanted >= 2000 && wanted <= 2100 ? wanted : currentYear

  const from = `${year}-01-01`
  const to = `${year}-12-31`

  const [budgetRevenue, budgetExpenses, budgetRent, roomSetup, revenue, expenses, ...ranges] = await Promise.all([
    supabase.from('budget_revenue').select('*').eq('property_id', ctx.property.id).eq('year', year).order('created_at'),
    supabase.from('budget_expenses').select('*').eq('property_id', ctx.property.id).eq('year', year).order('created_at'),
    supabase.from('budget_rent').select('*').eq('property_id', ctx.property.id).order('year_number'),
    supabase.from('budget_room_setup').select('*').eq('property_id', ctx.property.id).eq('year', year).order('room_name'),
    supabase.from('revenue').select('amount_thb, date, property_id').eq('organization_id', ctx.org.id).gte('date', from).lte('date', to).limit(ROW_CAP),
    supabase
      .from('expenses')
      .select('amount, amount_base, payment_date, category, property_id')
      .eq('organization_id', ctx.org.id)
      .gte('payment_date', from)
      .lte('payment_date', to)
      .limit(ROW_CAP),
    ...yearRanges(supabase, ctx.org.id, ctx.property.id),
  ])

  // Year selector: every year spanned by budget or actual data ∪ current year ±1 ∪ the selected year.
  const years = new Set<number>([currentYear - 1, currentYear, currentYear + 1, year])
  for (const [lo, hi] of ranges) {
    if (lo == null || hi == null) continue
    const a = Math.max(2000, Math.min(lo, hi))
    const b = Math.min(2100, Math.max(lo, hi))
    for (let y = a; y <= b; y++) years.add(y)
  }

  return (
    <BudgetClient
      year={year}
      currentYear={currentYear}
      years={[...years].sort((a, b) => b - a)}
      budgetRevenue={(budgetRevenue.data ?? []) as BudgetRevenue[]}
      budgetExpenses={(budgetExpenses.data ?? []) as BudgetExpense[]}
      budgetRent={(budgetRent.data ?? []) as BudgetRent[]}
      roomSetup={(roomSetup.data ?? []) as BudgetRoomSetup[]}
      revenue={(revenue.data ?? []) as ActualRevenueRow[]}
      expenses={(expenses.data ?? []) as ActualExpenseRow[]}
      actualsCapped={(revenue.data?.length ?? 0) >= ROW_CAP || (expenses.data?.length ?? 0) >= ROW_CAP}
    />
  )
}
