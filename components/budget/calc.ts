// Pure budget calculations shared by the Budget tabs. No React, no server code.

import type { BudgetRevenue, BudgetExpense, Revenue, Expense } from '@/lib/types'

export type ActualRevenueRow = Pick<Revenue, 'amount_thb' | 'date' | 'property_id'>
export type ActualExpenseRow = Pick<Expense, 'amount' | 'amount_base' | 'payment_date' | 'category' | 'property_id'>

export const MONTH_NUMBERS = Array.from({ length: 12 }, (_, i) => i + 1)

export const n = (v: number | string | null | undefined) => {
  const x = Number(v ?? 0)
  return isFinite(x) ? x : 0
}

export const cellKey = (room: string, month: number) => `${room}\u0000${month}`

/** Twelve monthly values indexed 0..11. */
export type Monthly = number[]
export const zeros = (): Monthly => Array.from({ length: 12 }, () => 0)
export const sum = (xs: number[]) => xs.reduce((s, x) => s + x, 0)

// ---------------------------------------------------------------------------
// Revenue matrix
// ---------------------------------------------------------------------------

export interface RevenueCell {
  room: string
  month: number
  total: number
  entries: BudgetRevenue[]
}

export interface RevenueMatrixData {
  cells: Map<string, RevenueCell>
  rowTotals: Map<string, number>
  colTotals: Monthly
  grand: number
  /** Monthly totals of matched rooms only. */
  monthly: Monthly
  /** Rows whose room_name does not match an active room. */
  unmatched: BudgetRevenue[]
}

export function buildRevenueMatrix(rows: BudgetRevenue[], roomNames: string[]): RevenueMatrixData {
  const names = new Set(roomNames)
  const cells = new Map<string, RevenueCell>()
  const rowTotals = new Map<string, number>(roomNames.map((r) => [r, 0]))
  const colTotals = zeros()
  const unmatched: BudgetRevenue[] = []
  for (const r of rows) {
    if (!names.has(r.room_name) || r.month < 1 || r.month > 12) {
      unmatched.push(r)
      continue
    }
    const k = cellKey(r.room_name, r.month)
    const cell = cells.get(k) ?? { room: r.room_name, month: r.month, total: 0, entries: [] }
    cell.entries.push(r)
    cell.total += n(r.amount_thb)
    cells.set(k, cell)
    rowTotals.set(r.room_name, (rowTotals.get(r.room_name) ?? 0) + n(r.amount_thb))
    colTotals[r.month - 1] += n(r.amount_thb)
  }
  return { cells, rowTotals, colTotals, grand: sum(colTotals), monthly: colTotals, unmatched }
}

// ---------------------------------------------------------------------------
// Expense items
// ---------------------------------------------------------------------------

export type ExpenseType = 'OPEX' | 'CAPEX'

export interface ExpenseItemRow {
  type: ExpenseType
  category: string
  item: string
  subcategory: string | null
  months: Monthly
  entries: BudgetExpense[][] // index 0..11
  total: number
}

export interface ExpenseCategoryGroup {
  type: ExpenseType
  category: string
  items: ExpenseItemRow[]
  months: Monthly
  total: number
}

export interface ExpenseTypeGroup {
  type: ExpenseType
  categories: ExpenseCategoryGroup[]
  months: Monthly
  total: number
}

export interface ExpenseData {
  groups: Record<ExpenseType, ExpenseTypeGroup>
  monthly: Monthly
  total: number
  /** Rows with a month outside 1..12 or an unknown expense type. */
  invalid: BudgetExpense[]
}

export function normaliseType(t: string | null | undefined): ExpenseType {
  return (t ?? '').toUpperCase() === 'CAPEX' ? 'CAPEX' : 'OPEX'
}

export function buildExpenseData(rows: BudgetExpense[], categoryOrder: string[]): ExpenseData {
  const byType: Record<ExpenseType, Map<string, Map<string, ExpenseItemRow>>> = { OPEX: new Map(), CAPEX: new Map() }
  const invalid: BudgetExpense[] = []
  for (const r of rows) {
    if (r.month < 1 || r.month > 12) {
      invalid.push(r)
      continue
    }
    const type = normaliseType(r.expense_type)
    const cats = byType[type]
    const items = cats.get(r.category) ?? new Map<string, ExpenseItemRow>()
    cats.set(r.category, items)
    const item =
      items.get(r.item_name) ??
      ({ type, category: r.category, item: r.item_name, subcategory: r.subcategory ?? null, months: zeros(), entries: Array.from({ length: 12 }, () => []), total: 0 } as ExpenseItemRow)
    items.set(r.item_name, item)
    item.months[r.month - 1] += n(r.amount_thb)
    item.entries[r.month - 1]!.push(r)
    item.total += n(r.amount_thb)
    if (!item.subcategory && r.subcategory) item.subcategory = r.subcategory
  }
  const order = new Map(categoryOrder.map((c, i) => [c, i]))
  const sortCats = (a: string, b: string) => {
    const ia = order.get(a) ?? Number.MAX_SAFE_INTEGER
    const ib = order.get(b) ?? Number.MAX_SAFE_INTEGER
    return ia !== ib ? ia - ib : a.localeCompare(b)
  }
  const build = (type: ExpenseType): ExpenseTypeGroup => {
    const categories: ExpenseCategoryGroup[] = [...byType[type].entries()]
      .sort(([a], [b]) => sortCats(a, b))
      .map(([category, items]) => {
        const list = [...items.values()].sort((a, b) => a.item.localeCompare(b.item))
        const months = zeros()
        for (const it of list) it.months.forEach((v, i) => (months[i] += v))
        return { type, category, items: list, months, total: sum(months) }
      })
    const months = zeros()
    for (const c of categories) c.months.forEach((v, i) => (months[i] += v))
    return { type, categories, months, total: sum(months) }
  }
  const groups = { OPEX: build('OPEX'), CAPEX: build('CAPEX') }
  const monthly = zeros()
  groups.OPEX.months.forEach((v, i) => (monthly[i] += v))
  groups.CAPEX.months.forEach((v, i) => (monthly[i] += v))
  return { groups, monthly, total: sum(monthly), invalid }
}

// ---------------------------------------------------------------------------
// Actuals
// ---------------------------------------------------------------------------

export function monthOf(iso: string | null | undefined): number | null {
  const m = Number((iso ?? '').slice(5, 7))
  return m >= 1 && m <= 12 ? m : null
}

export const expenseAmount = (e: ActualExpenseRow) => Math.abs(n(e.amount_base ?? e.amount))

export interface ActualsData {
  revenueMonthly: Monthly
  revenueTotal: number
  expenseMonthly: Monthly
  expenseTotal: number
  /** Actual expenses by category name (trimmed), with monthly breakdown. */
  expenseByCategory: Map<string, { months: Monthly; total: number }>
}

export function buildActuals(revenue: ActualRevenueRow[], expenses: ActualExpenseRow[], propertyId: string | null): ActualsData {
  const revenueMonthly = zeros()
  for (const r of revenue) {
    if (propertyId && r.property_id !== propertyId) continue
    const m = monthOf(r.date)
    if (!m) continue
    revenueMonthly[m - 1] += n(r.amount_thb)
  }
  const expenseMonthly = zeros()
  const expenseByCategory = new Map<string, { months: Monthly; total: number }>()
  for (const e of expenses) {
    if (propertyId && e.property_id !== propertyId) continue
    const m = monthOf(e.payment_date)
    if (!m) continue
    const amt = expenseAmount(e)
    expenseMonthly[m - 1] += amt
    const cat = (e.category ?? '').trim() || 'Uncategorised'
    const bucket = expenseByCategory.get(cat) ?? { months: zeros(), total: 0 }
    bucket.months[m - 1] += amt
    bucket.total += amt
    expenseByCategory.set(cat, bucket)
  }
  return { revenueMonthly, revenueTotal: sum(revenueMonthly), expenseMonthly, expenseTotal: sum(expenseMonthly), expenseByCategory }
}

// ---------------------------------------------------------------------------
// Variance helpers
// ---------------------------------------------------------------------------

export function variancePct(budget: number, actual: number): number | null {
  if (!budget) return null
  return ((actual - budget) / Math.abs(budget)) * 100
}

/** Tone for a variance (actual − budget). For expenses a positive variance is bad. */
export function varianceTone(variance: number, inverted = false): 'success' | 'danger' | 'neutral' {
  if (Math.abs(variance) < 0.005) return 'neutral'
  const good = inverted ? variance < 0 : variance > 0
  return good ? 'success' : 'danger'
}

/** Case-insensitive, trimmed category comparison key. */
export const catKey = (s: string | null | undefined) => (s ?? '').trim().toLowerCase()
