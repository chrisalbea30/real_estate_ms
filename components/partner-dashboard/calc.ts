// Pure calculations for the partner dashboard. Everything here is unit-testable
// and shared by the tab components. Amounts are in the organisation's base
// currency; dates are 'YYYY-MM-DD' strings.

import { daysInMonth, nightsBetween, nightsInMonth, revenueSourceGroup } from '@/lib/format'
import { matchesPartner } from '@/lib/schemas/partners'
import type { AccountBalance, BudgetExpense, BudgetRevenue, Expense, FoundingContribution, Guest, Partner, Revenue } from '@/lib/types'

export type ExpenseRow = Pick<Expense, 'category' | 'amount' | 'amount_base' | 'currency' | 'payment_date'>
export type RevenueRow = Pick<Revenue, 'amount_thb' | 'date' | 'type'>
export type ContributionRow = Pick<FoundingContribution, 'shareholder_id' | 'shareholder' | 'amount_thb' | 'amount_eur' | 'date'>
export type AccountRow = Pick<AccountBalance, 'id' | 'name' | 'type' | 'currency' | 'balance' | 'active'>
export type BudgetRevenueRow = Pick<BudgetRevenue, 'year' | 'month' | 'room_name' | 'amount_thb'>
export type BudgetExpenseRow = Pick<BudgetExpense, 'year' | 'month' | 'category' | 'item_name' | 'amount_thb' | 'expense_type'>
export type GuestRow = Pick<Guest, 'id' | 'check_in' | 'check_out' | 'amount_thb_stay' | 'payment' | 'room' | 'room_id' | 'guest_name'>

export interface DashboardData {
  expenses: ExpenseRow[]
  revenue: RevenueRow[]
  contributions: ContributionRow[]
  accounts: AccountRow[]
  budgetRevenue: BudgetRevenueRow[]
  budgetExpenses: BudgetExpenseRow[]
  guests: GuestRow[]
  partners: Partner[]
}

export const UNCATEGORISED = 'Uncategorised'

export const n = (v: number | null | undefined) => Number(v ?? 0)
export const sum = <T,>(rows: T[], f: (r: T) => number) => rows.reduce((s, r) => s + f(r), 0)
/** Expense amount in the base currency, sign ignored (signs are not meaningful in the source data). */
export const expenseBase = (e: Pick<ExpenseRow, 'amount' | 'amount_base'>) => Math.abs(n(e.amount_base ?? e.amount))
const yearOfDate = (d: string | null | undefined) => (d ?? '').slice(0, 4)
const monthOfDate = (d: string | null | undefined) => Number((d ?? '').slice(5, 7))

export function contributedBy(partner: Pick<Partner, 'id' | 'name'>, contributions: ContributionRow[]) {
  return sum(
    contributions.filter((c) => matchesPartner(c, partner)),
    (c) => n(c.amount_thb),
  )
}

// ---------------------------------------------------------------------------
// Financial overview
// ---------------------------------------------------------------------------

export interface Totals {
  revenue: number
  expenses: number
  capital: number
  accountTotal: number
  net: number
}

export function computeTotals(d: DashboardData): Totals {
  const revenue = sum(d.revenue, (r) => n(r.amount_thb))
  const expenses = sum(d.expenses, expenseBase)
  const capital = sum(d.contributions, (c) => n(c.amount_thb))
  const accountTotal = sum(d.accounts, (a) => n(a.balance))
  return { revenue, expenses, capital, accountTotal, net: revenue + capital - expenses }
}

export function revenueBySource(revenue: RevenueRow[]) {
  const map = new Map<string, number>()
  for (const r of revenue) {
    const k = revenueSourceGroup(r.type)
    map.set(k, (map.get(k) ?? 0) + n(r.amount_thb))
  }
  const total = sum(Array.from(map.values()), (v) => v)
  return Array.from(map.entries())
    .map(([label, value]) => ({ label, value, pct: total > 0 ? (value / total) * 100 : 0 }))
    .sort((a, b) => b.value - a.value)
}

export interface MonthPoint {
  month: number
  revenue: number
  expenses: number
}

/** Revenue by `revenue.date` month and expenses by `payment_date` month for one year. */
export function monthlySeries(revenue: RevenueRow[], expenses: ExpenseRow[], year: number): MonthPoint[] {
  const y = String(year)
  const rev = Array.from({ length: 12 }, () => 0)
  const exp = Array.from({ length: 12 }, () => 0)
  for (const r of revenue) {
    if (yearOfDate(r.date) !== y) continue
    const m = monthOfDate(r.date)
    if (m >= 1 && m <= 12) rev[m - 1] += n(r.amount_thb)
  }
  for (const e of expenses) {
    if (yearOfDate(e.payment_date) !== y) continue
    const m = monthOfDate(e.payment_date)
    if (m >= 1 && m <= 12) exp[m - 1] += expenseBase(e)
  }
  return rev.map((v, i) => ({ month: i + 1, revenue: v, expenses: exp[i] ?? 0 }))
}

/** Years present in the data plus the current year, newest first. */
export function yearsAvailable(d: DashboardData, currentYear: number): number[] {
  const set = new Set<number>([currentYear])
  const add = (y: string | number | null | undefined) => {
    const v = Number(y)
    if (Number.isInteger(v) && v > 2000 && v < 2100) set.add(v)
  }
  d.revenue.forEach((r) => add(yearOfDate(r.date)))
  d.expenses.forEach((e) => add(yearOfDate(e.payment_date)))
  d.budgetRevenue.forEach((b) => add(b.year))
  d.budgetExpenses.forEach((b) => add(b.year))
  return Array.from(set).sort((a, b) => b - a)
}

// ---------------------------------------------------------------------------
// Funding and shareholding
// ---------------------------------------------------------------------------

export interface PartnerFunding {
  partner: Partner
  contributed: number
  agreed: number
  pct: number
  /** contributed / agreed × 100, capped at 100; null when no agreed amount. */
  progress: number | null
}

export function partnerFunding(partners: Partner[], contributions: ContributionRow[]): PartnerFunding[] {
  return partners.map((partner) => {
    const contributed = contributedBy(partner, contributions)
    const agreed = n(partner.amount_to_found_thb)
    return { partner, contributed, agreed, pct: n(partner.share_percentage), progress: agreed > 0 ? Math.min(100, (contributed / agreed) * 100) : null }
  })
}

export interface Shareholding {
  partner: Partner
  nominalPct: number
  nominalAmount: number
  actualPaid: number
  /** nominal − paid; positive = still owes, negative = paid more than the nominal share. */
  balance: number
  fundedPct: number | null
}

export function shareholding(partners: Partner[], contributions: ContributionRow[], totalFounded: number): Shareholding[] {
  return partners.map((partner) => {
    const nominalPct = n(partner.share_percentage)
    const nominalAmount = (totalFounded * nominalPct) / 100
    const actualPaid = contributedBy(partner, contributions)
    return { partner, nominalPct, nominalAmount, actualPaid, balance: nominalAmount - actualPaid, fundedPct: nominalAmount > 0 ? (actualPaid / nominalAmount) * 100 : null }
  })
}

// ---------------------------------------------------------------------------
// Budget vs actual (P&L)
// ---------------------------------------------------------------------------

export interface PLRow {
  key: string
  label: string
  budget: number
  /** null = not tracked ("—"); never subtracted from the net. */
  actual: number | null
  kind: 'revenue' | 'expense'
  /** CAPEX category header row (items follow). */
  group?: boolean
  /** CAPEX item row under a category. */
  sub?: boolean
  note?: string
}

export interface PL {
  budgetRevenue: number
  actualRevenue: number
  opex: PLRow[]
  capex: PLRow[]
  opexBudget: number
  opexActual: number
  capexBudget: number
  capexActual: number
  netBudget: number
  netActual: number
}

/**
 * OPEX rows use the organisation's expense categories as the shared vocabulary
 * (settings order first, then any other category present). Actuals are matched
 * by category name; uncategorised spend gets its own row so nothing is hidden.
 * CAPEX actuals are only attributed when the CAPEX category is not already an
 * OPEX row, so no expense is counted twice.
 */
export function budgetVsActual(d: DashboardData, year: number, settingsCategories: string[]): PL {
  const y = String(year)
  const budgetRevenue = sum(
    d.budgetRevenue.filter((b) => b.year === year),
    (b) => n(b.amount_thb),
  )
  const actualRevenue = sum(
    d.revenue.filter((r) => yearOfDate(r.date) === y),
    (r) => n(r.amount_thb),
  )

  const actualByCat = new Map<string, number>()
  for (const e of d.expenses) {
    if (yearOfDate(e.payment_date) !== y) continue
    const c = (e.category ?? '').trim() || UNCATEGORISED
    actualByCat.set(c, (actualByCat.get(c) ?? 0) + expenseBase(e))
  }

  const opexBudget = new Map<string, number>()
  const capexBudget = new Map<string, Map<string, number>>() // category → item → amount
  for (const b of d.budgetExpenses) {
    if (b.year !== year) continue
    const c = (b.category ?? '').trim() || UNCATEGORISED
    if (b.expense_type === 'CAPEX') {
      const items = capexBudget.get(c) ?? new Map<string, number>()
      items.set(b.item_name, (items.get(b.item_name) ?? 0) + n(b.amount_thb))
      capexBudget.set(c, items)
    } else {
      opexBudget.set(c, (opexBudget.get(c) ?? 0) + n(b.amount_thb))
    }
  }

  const opexCats: string[] = []
  const push = (c: string) => {
    if (!opexCats.includes(c)) opexCats.push(c)
  }
  settingsCategories.map((c) => c.trim()).filter(Boolean).forEach(push)
  opexBudget.forEach((_, c) => push(c))
  // Actual categories that only exist as CAPEX budget categories belong to CAPEX.
  actualByCat.forEach((_, c) => {
    if (!capexBudget.has(c)) push(c)
  })

  const opex: PLRow[] = opexCats
    .map((c) => ({ key: `opex:${c}`, label: c, budget: opexBudget.get(c) ?? 0, actual: actualByCat.get(c) ?? 0, kind: 'expense' as const }))
    .filter((r) => r.budget !== 0 || r.actual !== 0)
  const opexClaimed = new Set(opex.map((r) => r.label))

  const capex: PLRow[] = []
  let capexBudgetTotal = 0
  let capexActualTotal = 0
  for (const [c, items] of capexBudget) {
    const budget = sum(Array.from(items.values()), (v) => v)
    const shared = opexClaimed.has(c)
    const actual = shared ? null : actualByCat.has(c) ? (actualByCat.get(c) ?? 0) : null
    capex.push({ key: `capex:${c}`, label: c, budget, actual, kind: 'expense', group: true, note: shared ? 'Spend counted under operating expenses' : actual == null ? 'No expenses in this category yet' : undefined })
    for (const [item, amount] of items) capex.push({ key: `capex:${c}:${item}`, label: item, budget: amount, actual: null, kind: 'expense', sub: true })
    capexBudgetTotal += budget
    capexActualTotal += actual ?? 0
  }

  const opexBudgetTotal = sum(opex, (r) => r.budget)
  const opexActualTotal = sum(opex, (r) => r.actual ?? 0)

  return {
    budgetRevenue,
    actualRevenue,
    opex,
    capex,
    opexBudget: opexBudgetTotal,
    opexActual: opexActualTotal,
    capexBudget: capexBudgetTotal,
    capexActual: capexActualTotal,
    netBudget: budgetRevenue - opexBudgetTotal - capexBudgetTotal,
    netActual: actualRevenue - opexActualTotal - capexActualTotal,
  }
}

// ---------------------------------------------------------------------------
// Business KPIs
// ---------------------------------------------------------------------------

export interface MonthKpi {
  year: number
  month: number
  days: number
  occupiedNights: number
  /** Stay totals pro-rated to the nights inside the month. */
  monthRevenue: number
  bookings: number
  occupancy: number
  adr: number
  revpar: number
  avgStay: number
}

export function kpisFor(guests: GuestRow[], year: number, month: number, totalRooms: number): MonthKpi {
  const days = daysInMonth(year, month)
  const available = Math.max(1, totalRooms) * days
  let occupiedNights = 0
  let monthRevenue = 0
  let bookings = 0
  for (const g of guests) {
    const nights = nightsInMonth(g.check_in, g.check_out, year, month)
    if (nights <= 0) continue
    const total = nightsBetween(g.check_in, g.check_out)
    occupiedNights += nights
    bookings += 1
    if (total > 0) monthRevenue += (n(g.amount_thb_stay) * nights) / total
  }
  return {
    year,
    month,
    days,
    occupiedNights,
    monthRevenue,
    bookings,
    occupancy: (occupiedNights / available) * 100,
    adr: occupiedNights > 0 ? monthRevenue / occupiedNights : 0,
    revpar: monthRevenue / available,
    avgStay: bookings > 0 ? occupiedNights / bookings : 0,
  }
}

/** The `count` months ending at (year, month), oldest first. */
export function trailingMonths(year: number, month: number, count = 12): { year: number; month: number }[] {
  const out: { year: number; month: number }[] = []
  let y = year
  let m = month
  for (let i = 0; i < count; i++) {
    out.unshift({ year: y, month: m })
    m -= 1
    if (m < 1) {
      m = 12
      y -= 1
    }
  }
  return out
}

// ---------------------------------------------------------------------------
// Cost structure and forecast
// ---------------------------------------------------------------------------

export function costStructure(expenses: ExpenseRow[]) {
  const map = new Map<string, number>()
  for (const e of expenses) {
    const c = (e.category ?? '').trim() || 'Other'
    map.set(c, (map.get(c) ?? 0) + expenseBase(e))
  }
  const total = sum(Array.from(map.values()), (v) => v)
  return Array.from(map.entries())
    .map(([label, value]) => ({ label, value, pct: total > 0 ? (value / total) * 100 : 0 }))
    .sort((a, b) => b.value - a.value)
}

export interface Forecast {
  futureRevenue: number
  remainingBudgetRevenue: number
  remainingBudgetExpenses: number
  projectedCash: number
  upcoming: GuestRow[]
}

export function forecast(d: DashboardData, today: string, accountTotal: number): Forecast {
  const y = Number(today.slice(0, 4))
  const m = Number(today.slice(5, 7))
  const upcoming = d.guests.filter((g) => g.check_in > today).sort((a, b) => (a.check_in < b.check_in ? -1 : a.check_in > b.check_in ? 1 : 0))
  const futureRevenue = sum(upcoming, (g) => n(g.amount_thb_stay))
  const remainingBudgetRevenue = sum(
    d.budgetRevenue.filter((b) => b.year === y && b.month > m),
    (b) => n(b.amount_thb),
  )
  const remainingBudgetExpenses = sum(
    d.budgetExpenses.filter((b) => b.year === y && b.month > m),
    (b) => n(b.amount_thb),
  )
  return { futureRevenue, remainingBudgetRevenue, remainingBudgetExpenses, projectedCash: accountTotal + futureRevenue - remainingBudgetExpenses, upcoming }
}
