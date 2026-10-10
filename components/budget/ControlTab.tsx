'use client'

import { useMemo, useState } from 'react'
import { TrendingUp, TrendingDown, Receipt, Wallet, Target, Scale, Info } from 'lucide-react'
import { Section } from '@/components/ui/PageHeader'
import { StatCard } from '@/components/ui/StatCard'
import { Chips } from '@/components/ui/Tabs'
import { ExportMenu, type ExportRow } from '@/components/ui/ExportMenu'
import { useApp } from '@/components/app/AppProvider'
import { cn, MONTHS, formatPct } from '@/lib/format'
import {
  buildRevenueMatrix,
  buildExpenseData,
  buildActuals,
  variancePct,
  varianceTone,
  catKey,
  type ActualRevenueRow,
  type ActualExpenseRow,
} from '@/components/budget/calc'
import { TH, TD, TD_LABEL, STICKY, STICKY_HEAD } from '@/components/budget/Matrix'
import type { BudgetRevenue, BudgetExpense } from '@/lib/types'

type View = 'pnl' | 'monthly'
type Scope = 'org' | 'property'

interface PnlRow {
  key: string
  label: string
  kind: 'header' | 'line' | 'subtotal' | 'total'
  budget: number
  /** null = not tracked ("—") */
  actual: number | null
  /** Expenses: a positive variance (actual above budget) is bad. */
  inverted: boolean
  indent?: boolean
}

export function ControlTab({
  year,
  budgetRevenue,
  budgetExpenses,
  revenue,
  expenses,
  roomNames,
  actualsCapped,
}: {
  year: number
  budgetRevenue: BudgetRevenue[]
  budgetExpenses: BudgetExpense[]
  revenue: ActualRevenueRow[]
  expenses: ActualExpenseRow[]
  roomNames: string[]
  actualsCapped: boolean
}) {
  const { fmt, categories, properties, property } = useApp()
  const cats = categories('expense')
  const [view, setView] = useState<View>('pnl')
  const [scope, setScope] = useState<Scope>('org')
  const multiProperty = properties.length > 1

  const matrix = useMemo(() => buildRevenueMatrix(budgetRevenue, roomNames), [budgetRevenue, roomNames])
  const exp = useMemo(() => buildExpenseData(budgetExpenses, cats), [budgetExpenses, cats])
  const actuals = useMemo(() => buildActuals(revenue, expenses, scope === 'property' ? property.id : null), [revenue, expenses, scope, property.id])

  const budgetRevenueTotal = matrix.grand
  const budgetExpenseTotal = exp.total
  const budgetResult = budgetRevenueTotal - budgetExpenseTotal
  const actualResult = actuals.revenueTotal - actuals.expenseTotal

  // ---- P&L rows ----
  const pnl = useMemo<PnlRow[]>(() => {
    const rows: PnlRow[] = []
    rows.push({ key: 'rev', label: 'Revenue', kind: 'total', budget: budgetRevenueTotal, actual: actuals.revenueTotal, inverted: false })
    rows.push({ key: 'opex-h', label: 'Operating expenses (OPEX)', kind: 'header', budget: 0, actual: null, inverted: true })
    const seen = new Set<string>()
    for (const c of exp.groups.OPEX.categories) {
      const k = catKey(c.category)
      seen.add(k)
      const actual = [...actuals.expenseByCategory.entries()].filter(([name]) => catKey(name) === k).reduce((s, [, v]) => s + v.total, 0)
      rows.push({ key: `opex-${c.category}`, label: c.category, kind: 'line', budget: c.total, actual, inverted: true, indent: true })
    }
    // Actual categories without a budget line, in the settings order then alphabetically.
    const order = new Map(cats.map((c, i) => [catKey(c), i]))
    const extra = [...actuals.expenseByCategory.entries()]
      .filter(([name]) => !seen.has(catKey(name)))
      .sort(([a], [b]) => (order.get(catKey(a)) ?? 9999) - (order.get(catKey(b)) ?? 9999) || a.localeCompare(b))
    for (const [name, v] of extra) rows.push({ key: `opex-x-${name}`, label: name, kind: 'line', budget: 0, actual: v.total, inverted: true, indent: true })
    rows.push({ key: 'opex-t', label: 'Total OPEX', kind: 'subtotal', budget: exp.groups.OPEX.total, actual: actuals.expenseTotal, inverted: true })
    rows.push({ key: 'capex-h', label: 'Capital expenses (CAPEX)', kind: 'header', budget: 0, actual: null, inverted: true })
    for (const c of exp.groups.CAPEX.categories) {
      for (const it of c.items) rows.push({ key: `capex-${c.category}-${it.item}`, label: `${it.item} · ${c.category}`, kind: 'line', budget: it.total, actual: null, inverted: true, indent: true })
    }
    rows.push({ key: 'capex-t', label: 'Total CAPEX', kind: 'subtotal', budget: exp.groups.CAPEX.total, actual: null, inverted: true })
    rows.push({ key: 'exp-t', label: 'Total expenses', kind: 'total', budget: budgetExpenseTotal, actual: actuals.expenseTotal, inverted: true })
    rows.push({ key: 'net', label: 'Net result', kind: 'total', budget: budgetResult, actual: actualResult, inverted: false })
    return rows
  }, [exp, actuals, cats, budgetRevenueTotal, budgetExpenseTotal, budgetResult, actualResult])

  const pnlExport = useMemo<ExportRow[]>(
    () =>
      pnl
        .filter((r) => r.kind !== 'header')
        .map((r) => ({
          Line: r.label,
          Budget: r.budget,
          Actual: r.actual ?? '',
          Variance: r.actual == null ? '' : r.actual - r.budget,
          'Variance %': r.actual == null ? '' : formatPct(variancePct(r.budget, r.actual)),
        })),
    [pnl],
  )

  // ---- Monthly rows ----
  const monthlyRows = useMemo(() => {
    const budgetRev = matrix.monthly
    const budgetExp = exp.monthly
    const line = (month: string, rb: number, ra: number, eb: number, ea: number) => ({ month, rb, ra, rv: ra - rb, eb, ea, ev: ea - eb, nb: rb - eb, na: ra - ea, nv: ra - ea - (rb - eb) })
    const rows = MONTHS.map((m, i) => line(m, budgetRev[i] ?? 0, actuals.revenueMonthly[i] ?? 0, budgetExp[i] ?? 0, actuals.expenseMonthly[i] ?? 0))
    const total = line(
      'Total',
      rows.reduce((s, r) => s + r.rb, 0),
      rows.reduce((s, r) => s + r.ra, 0),
      rows.reduce((s, r) => s + r.eb, 0),
      rows.reduce((s, r) => s + r.ea, 0),
    )
    return { rows, total }
  }, [matrix.monthly, exp.monthly, actuals])

  const monthlyExport = useMemo<ExportRow[]>(
    () =>
      [...monthlyRows.rows, monthlyRows.total].map((r) => ({
        Month: r.month,
        'Revenue budget': r.rb,
        'Revenue actual': r.ra,
        'Revenue variance': r.rv,
        'Expenses budget': r.eb,
        'Expenses actual': r.ea,
        'Expenses variance': r.ev,
        'Result budget': r.nb,
        'Result actual': r.na,
        'Result variance': r.nv,
      })),
    [monthlyRows],
  )

  const varianceCell = (budget: number, actual: number | null, inverted: boolean, withPct = false) => {
    if (actual == null) return <span className="text-muted">—</span>
    const v = actual - budget
    const tone = varianceTone(v, inverted)
    const cls = tone === 'success' ? 'text-success' : tone === 'danger' ? 'text-danger' : 'text-muted'
    return (
      <span className={cn('font-medium', cls)}>
        {fmt(v, { sign: true })}
        {withPct && <span className="ml-1 text-xs opacity-80">({formatPct(variancePct(budget, actual))})</span>}
      </span>
    )
  }

  const scopeLabel = scope === 'property' ? property.name : 'all properties'

  return (
    <div>
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Budget revenue" value={fmt(budgetRevenueTotal)} icon={Target} tone="primary" />
        <StatCard label="Actual revenue" value={fmt(actuals.revenueTotal)} icon={TrendingUp} tone="success" sub={varianceCell(budgetRevenueTotal, actuals.revenueTotal, false, true)} />
        <StatCard label="Budget expenses" value={fmt(budgetExpenseTotal)} icon={Receipt} tone="primary" />
        <StatCard label="Actual expenses" value={fmt(actuals.expenseTotal)} icon={Wallet} tone="warning" sub={varianceCell(budgetExpenseTotal, actuals.expenseTotal, true, true)} />
        <StatCard label="Budget result" value={fmt(budgetResult)} icon={Scale} tone={budgetResult >= 0 ? 'info' : 'danger'} />
        <StatCard label="Actual result" value={fmt(actualResult)} icon={actualResult >= 0 ? TrendingUp : TrendingDown} tone={actualResult >= 0 ? 'success' : 'danger'} sub={varianceCell(budgetResult, actualResult, false, true)} />
      </div>

      <div className="mb-4 flex items-start gap-2 rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-xs text-ink-2">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" />
        <div className="space-y-0.5">
          <p>
            Budget figures are for <strong>{property.name}</strong>; actuals come from revenue and expenses dated in {year} across <strong>{scopeLabel}</strong>. Expenses in other currencies use their base-currency amount.
          </p>
          <p>Actual expenses are matched to OPEX lines by category name. CAPEX actuals are not tracked separately, so every actual expense counts towards OPEX.</p>
          {actualsCapped && <p className="text-warning">More than 5,000 actual rows exist for this year; totals may be incomplete.</p>}
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <Chips
          value={view}
          onChange={setView}
          options={[
            { key: 'pnl', label: 'P&L' },
            { key: 'monthly', label: 'Monthly' },
          ]}
        />
        <div className="flex items-center gap-2">
          {multiProperty && (
            <select className="select !min-h-9 w-auto py-1 text-sm" value={scope} onChange={(e) => setScope(e.target.value as Scope)} aria-label="Actuals scope">
              <option value="org">Actuals: all properties</option>
              <option value="property">Actuals: {property.name}</option>
            </select>
          )}
          {view === 'pnl' ? (
            <ExportMenu rows={pnlExport} filename={`budget-pnl-${year}`} title={`Budget vs actual ${year}`} />
          ) : (
            <ExportMenu rows={monthlyExport} filename={`budget-monthly-${year}`} title={`Budget vs actual by month ${year}`} />
          )}
        </div>
      </div>

      {view === 'pnl' ? (
        <Section>
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[40rem] border-collapse text-sm tabular">
              <thead>
                <tr>
                  <th className={cn(TH, 'text-left', STICKY_HEAD, 'min-w-[12rem]')}>Line</th>
                  <th className={cn(TH, 'min-w-[7rem] text-right')}>Budget</th>
                  <th className={cn(TH, 'min-w-[7rem] text-right')}>Actual</th>
                  <th className={cn(TH, 'min-w-[9rem] text-right')}>Variance</th>
                </tr>
              </thead>
              <tbody>
                {pnl.map((r) => {
                  if (r.kind === 'header') {
                    return (
                      <tr key={r.key}>
                        <td className={cn(TD_LABEL, 'sticky left-0 z-10 bg-primary-soft/40 text-xs font-semibold uppercase tracking-wide text-primary-soft-fg')}>{r.label}</td>
                        <td className={cn(TD, 'bg-primary-soft/40')} colSpan={3} />
                      </tr>
                    )
                  }
                  const strong = r.kind !== 'line'
                  const bg = r.kind === 'total' ? 'bg-surface-2' : ''
                  return (
                    <tr key={r.key} className={cn(strong && 'font-semibold')}>
                      <td className={cn(TD_LABEL, 'sticky left-0 z-10', bg || 'bg-surface', r.indent && 'pl-6 font-normal')}>{r.label}</td>
                      <td className={cn(TD, 'px-3 py-2.5', bg)}>{fmt(r.budget)}</td>
                      <td className={cn(TD, 'px-3 py-2.5', bg)}>{r.actual == null ? <span className="text-muted">—</span> : fmt(r.actual)}</td>
                      <td className={cn(TD, 'px-3 py-2.5', bg)}>{varianceCell(r.budget, r.actual, r.inverted, true)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Section>
      ) : (
        <Section>
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[64rem] border-collapse text-sm tabular">
              <thead>
                <tr>
                  <th className={cn(TH, 'text-left', STICKY_HEAD)} rowSpan={2}>
                    Month
                  </th>
                  <th className={cn(TH, 'text-center')} colSpan={3}>
                    Revenue
                  </th>
                  <th className={cn(TH, 'text-center')} colSpan={3}>
                    Expenses
                  </th>
                  <th className={cn(TH, 'text-center')} colSpan={3}>
                    Result
                  </th>
                </tr>
                <tr>
                  {['Budget', 'Actual', 'Variance', 'Budget', 'Actual', 'Variance', 'Budget', 'Actual', 'Variance'].map((h, i) => (
                    <th key={i} className={cn(TH, 'min-w-[6.5rem] text-right font-medium normal-case tracking-normal')}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {monthlyRows.rows.map((r) => (
                  <tr key={r.month}>
                    <td className={cn(TD_LABEL, STICKY, 'font-medium')}>{r.month}</td>
                    <td className={cn(TD, 'px-3 py-2.5')}>{fmt(r.rb)}</td>
                    <td className={cn(TD, 'px-3 py-2.5')}>{fmt(r.ra)}</td>
                    <td className={cn(TD, 'px-3 py-2.5')}>{varianceCell(r.rb, r.ra, false)}</td>
                    <td className={cn(TD, 'border-l border-line px-3 py-2.5')}>{fmt(r.eb)}</td>
                    <td className={cn(TD, 'px-3 py-2.5')}>{fmt(r.ea)}</td>
                    <td className={cn(TD, 'px-3 py-2.5')}>{varianceCell(r.eb, r.ea, true)}</td>
                    <td className={cn(TD, 'border-l border-line px-3 py-2.5')}>{fmt(r.nb)}</td>
                    <td className={cn(TD, 'px-3 py-2.5')}>{fmt(r.na)}</td>
                    <td className={cn(TD, 'px-3 py-2.5')}>{varianceCell(r.nb, r.na, false)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-semibold">
                  <td className={cn(TD_LABEL, 'sticky left-0 z-10 bg-surface-2')}>Total</td>
                  <td className={cn(TD, 'bg-surface-2 px-3 py-2.5')}>{fmt(monthlyRows.total.rb)}</td>
                  <td className={cn(TD, 'bg-surface-2 px-3 py-2.5')}>{fmt(monthlyRows.total.ra)}</td>
                  <td className={cn(TD, 'bg-surface-2 px-3 py-2.5')}>{varianceCell(monthlyRows.total.rb, monthlyRows.total.ra, false)}</td>
                  <td className={cn(TD, 'border-l border-line bg-surface-2 px-3 py-2.5')}>{fmt(monthlyRows.total.eb)}</td>
                  <td className={cn(TD, 'bg-surface-2 px-3 py-2.5')}>{fmt(monthlyRows.total.ea)}</td>
                  <td className={cn(TD, 'bg-surface-2 px-3 py-2.5')}>{varianceCell(monthlyRows.total.eb, monthlyRows.total.ea, true)}</td>
                  <td className={cn(TD, 'border-l border-line bg-surface-2 px-3 py-2.5')}>{fmt(monthlyRows.total.nb)}</td>
                  <td className={cn(TD, 'bg-surface-2 px-3 py-2.5')}>{fmt(monthlyRows.total.na)}</td>
                  <td className={cn(TD, 'bg-surface-2 px-3 py-2.5')}>{varianceCell(monthlyRows.total.nb, monthlyRows.total.na, false)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Section>
      )}
    </div>
  )
}
