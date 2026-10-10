'use client'

import { useMemo } from 'react'
import { Banknote, Receipt, Scale, Wallet } from 'lucide-react'
import { StatCard, StatGrid } from '@/components/ui/StatCard'
import { Badge } from '@/components/ui/Badge'
import { useApp } from '@/components/app/AppProvider'
import { MONTHS, titleCase } from '@/lib/format'
import { monthlySeries, revenueBySource, sum, type DashboardData, type Totals } from '@/components/partner-dashboard/calc'
import { Meter, RankedBars, YearChips } from '@/components/partner-dashboard/shared'

export function FinancialTab({ data, totals, year, years, onYear }: { data: DashboardData; totals: Totals; year: number; years: number[]; onYear: (y: number) => void }) {
  const { fmt } = useApp()
  const sources = useMemo(() => revenueBySource(data.revenue), [data.revenue])
  const monthly = useMemo(() => monthlySeries(data.revenue, data.expenses, year), [data.revenue, data.expenses, year])
  const max = Math.max(0, ...monthly.map((m) => Math.max(m.revenue, m.expenses)))
  const yearRevenue = sum(monthly, (m) => m.revenue)
  const yearExpenses = sum(monthly, (m) => m.expenses)

  return (
    <div className="space-y-6">
      <StatGrid>
        <StatCard label="Total revenue" sub="all time" value={fmt(totals.revenue)} icon={Banknote} tone="primary" />
        <StatCard label="Total expenses" sub="all time" value={fmt(totals.expenses)} icon={Receipt} />
        <StatCard label="Net position" sub="revenue + capital − expenses" value={fmt(totals.net)} icon={Scale} tone={totals.net >= 0 ? 'success' : 'danger'} />
        <StatCard label="Account total" sub={`${data.accounts.length} account${data.accounts.length === 1 ? '' : 's'}`} value={fmt(totals.accountTotal)} icon={Wallet} tone="info" />
      </StatGrid>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 font-display text-lg font-semibold text-ink">Revenue by source</h2>
          <div className="card p-4">
            <RankedBars rows={sources} format={fmt} emptyText="No revenue recorded yet." />
          </div>
        </section>
        <section>
          <h2 className="mb-3 font-display text-lg font-semibold text-ink">Accounts</h2>
          {data.accounts.length === 0 ? (
            <div className="card p-4 text-sm text-muted">No accounts set up.</div>
          ) : (
            <ul className="card divide-y divide-line">
              {data.accounts.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate font-medium text-ink">{a.name}</span>
                    <Badge>{titleCase(a.type)}</Badge>
                  </div>
                  <span className={`shrink-0 font-semibold tabular ${Number(a.balance) < 0 ? 'text-danger' : 'text-ink'}`}>{fmt(a.balance)}</span>
                </li>
              ))}
              <li className="flex items-center justify-between gap-3 bg-surface-2 px-4 py-2.5 text-sm">
                <span className="font-semibold text-ink">Total</span>
                <span className="font-semibold tabular text-ink">{fmt(totals.accountTotal)}</span>
              </li>
            </ul>
          )}
        </section>
      </div>

      <section>
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold text-ink">Monthly revenue vs expenses</h2>
            <p className="text-sm text-muted">
              {year}: {fmt(yearRevenue)} revenue · {fmt(yearExpenses)} expenses · net <span className={yearRevenue - yearExpenses >= 0 ? 'text-success' : 'text-danger'}>{fmt(yearRevenue - yearExpenses)}</span>
            </p>
          </div>
          <YearChips years={years} value={year} onChange={onYear} />
        </div>
        <div className="card p-4">
          <div className="mb-3 flex flex-wrap gap-4 text-xs text-muted" aria-label="Legend">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-4 rounded-full bg-primary" /> Revenue
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-4 rounded-full bg-accent" /> Expenses
            </span>
          </div>
          {max === 0 ? (
            <p className="text-sm text-muted">Nothing recorded in {year}.</p>
          ) : (
            <div className="space-y-2.5">
              {monthly.map((m) => (
                <div key={m.month} className="grid grid-cols-[2.25rem_minmax(0,1fr)] items-center gap-2 text-xs" title={`${MONTHS[m.month - 1]} ${year}: revenue ${fmt(m.revenue)}, expenses ${fmt(m.expenses)}`}>
                  <span className="text-muted">{MONTHS[m.month - 1]}</span>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Meter value={m.revenue} max={max} tone="primary" className="flex-1" />
                      <span className="w-24 shrink-0 text-right tabular text-ink">{fmt(m.revenue)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Meter value={m.expenses} max={max} tone="accent" className="flex-1" />
                      <span className="w-24 shrink-0 text-right tabular text-ink-2">{fmt(m.expenses)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
