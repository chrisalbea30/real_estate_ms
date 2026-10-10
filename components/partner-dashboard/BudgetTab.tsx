'use client'

import { useMemo } from 'react'
import { Banknote, Receipt, Scale, Landmark } from 'lucide-react'
import { StatCard, StatGrid } from '@/components/ui/StatCard'
import { DataTable, CardRow, CardTitle, type Column } from '@/components/ui/DataTable'
import { useApp } from '@/components/app/AppProvider'
import { cn } from '@/lib/format'
import { budgetVsActual, type DashboardData, type PLRow } from '@/components/partner-dashboard/calc'
import { VarianceText, YearChips, varianceTone } from '@/components/partner-dashboard/shared'

export function BudgetTab({ data, year, years, onYear }: { data: DashboardData; year: number; years: number[]; onYear: (y: number) => void }) {
  const { fmt, settings } = useApp()
  const pl = useMemo(() => budgetVsActual(data, year, settings.categories?.expense ?? []), [data, year, settings.categories?.expense])

  const revenueRows: PLRow[] = [{ key: 'revenue', label: 'Room revenue', budget: pl.budgetRevenue, actual: pl.actualRevenue, kind: 'revenue' }]
  const budgetExpenses = pl.opexBudget + pl.capexBudget
  const actualExpenses = pl.opexActual + pl.capexActual

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">Budget for the rooms of this property against revenue and expenses dated in {year}.</p>
        <YearChips years={years} value={year} onChange={onYear} />
      </div>

      <StatGrid>
        <StatCard label="Revenue" sub={`budget ${fmt(pl.budgetRevenue)}`} value={fmt(pl.actualRevenue)} icon={Banknote} tone={pl.actualRevenue >= pl.budgetRevenue ? 'success' : 'warning'} />
        <StatCard label="Expenses" sub={`budget ${fmt(budgetExpenses)}`} value={fmt(actualExpenses)} icon={Receipt} tone={actualExpenses <= budgetExpenses ? 'success' : 'danger'} />
        <StatCard label="Net result" sub={`budget ${fmt(pl.netBudget)}`} value={fmt(pl.netActual)} icon={Scale} tone={pl.netActual >= 0 ? 'success' : 'danger'} />
        <StatCard label="Variance" sub="net actual − budget" value={fmt(pl.netActual - pl.netBudget)} icon={Landmark} tone={pl.netActual - pl.netBudget >= 0 ? 'success' : 'danger'} />
      </StatGrid>

      <PLTable title="Revenue" rows={revenueRows} kind="revenue" totals={{ budget: pl.budgetRevenue, actual: pl.actualRevenue }} />
      <PLTable title="Operating expenses (OPEX)" description="Matched by expense category" rows={pl.opex} kind="expense" totals={{ budget: pl.opexBudget, actual: pl.opexActual }} emptyText={`No operating budget or expenses in ${year}.`} />
      <PLTable title="Capital expenditure (CAPEX)" description="Actuals are attributed per category; items show budget only" rows={pl.capex} kind="expense" totals={{ budget: pl.capexBudget, actual: pl.capexActual }} emptyText={`No CAPEX budgeted for ${year}.`} />

      <div className="card p-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted">Net budget</div>
            <div className="mt-1 font-display text-xl font-semibold tabular text-ink">{fmt(pl.netBudget)}</div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted">Net actual</div>
            <div className={cn('mt-1 font-display text-xl font-semibold tabular', pl.netActual >= 0 ? 'text-success' : 'text-danger')}>{fmt(pl.netActual)}</div>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted">Variance</div>
            <div className="mt-1 font-display text-xl font-semibold">
              <VarianceText budget={pl.netBudget} actual={pl.netActual} kind="revenue" format={fmt} />
            </div>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted">Net = revenue − OPEX − CAPEX. CAPEX items without tracked actuals are shown as “—” and are not subtracted.</p>
      </div>
    </div>
  )
}

function PLTable({ title, description, rows, kind, totals, emptyText }: { title: string; description?: string; rows: PLRow[]; kind: 'revenue' | 'expense'; totals: { budget: number; actual: number }; emptyText?: string }) {
  const { fmt } = useApp()
  const columns: Column<PLRow>[] = [
    {
      key: 'label',
      header: 'Item',
      cell: (r) => (
        <div className={cn('min-w-0', r.sub && 'pl-4')}>
          <div className={cn(r.group ? 'font-semibold' : r.sub ? 'text-ink-2' : 'font-medium')}>{r.label}</div>
          {r.note && <div className="text-xs text-muted">{r.note}</div>}
        </div>
      ),
    },
    { key: 'budget', header: 'Budget', cell: (r) => <span className="tabular">{fmt(r.budget)}</span>, align: 'right' },
    { key: 'actual', header: 'Actual', cell: (r) => (r.actual == null ? <span className="text-muted">—</span> : <span className="font-semibold tabular">{fmt(r.actual)}</span>), align: 'right' },
    { key: 'variance', header: 'Variance', cell: (r) => <VarianceText budget={r.budget} actual={r.actual} kind={r.kind} format={fmt} />, align: 'right', hide: 'sm' },
  ]
  const tone = varianceTone(totals.actual - totals.budget, kind)
  return (
    <section>
      <div className="mb-3">
        <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>
        {description && <p className="text-sm text-muted">{description}</p>}
      </div>
      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(r) => r.key}
        pageSize={0}
        empty={<div className="card p-4 text-sm text-muted">{emptyText ?? 'Nothing here.'}</div>}
        footer={(list) =>
          list.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 tabular">
              <span className="font-semibold text-ink">Total</span>
              <span className="flex flex-wrap gap-x-4 gap-y-1">
                <span>
                  <span className="text-muted">Budget </span>
                  <strong>{fmt(totals.budget)}</strong>
                </span>
                <span>
                  <span className="text-muted">Actual </span>
                  <strong>{fmt(totals.actual)}</strong>
                </span>
                <span className={tone === 'success' ? 'text-success' : tone === 'danger' ? 'text-danger' : 'text-muted'}>
                  <span className="text-muted">Variance </span>
                  <strong>{fmt(totals.actual - totals.budget)}</strong>
                </span>
              </span>
            </div>
          )
        }
        renderCard={(r) => (
          <>
            <CardTitle title={<span className={cn(r.sub && 'pl-3 font-normal text-ink-2')}>{r.label}</span>} subtitle={r.note} />
            <CardRow label="Budget">{fmt(r.budget)}</CardRow>
            <CardRow label="Actual">{r.actual == null ? '—' : fmt(r.actual)}</CardRow>
            <CardRow label="Variance">
              <VarianceText budget={r.budget} actual={r.actual} kind={r.kind} format={fmt} />
            </CardRow>
          </>
        )}
      />
    </section>
  )
}
