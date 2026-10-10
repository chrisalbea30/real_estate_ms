'use client'

import { useMemo } from 'react'
import { Receipt, Layers } from 'lucide-react'
import { StatCard, StatGrid } from '@/components/ui/StatCard'
import { useApp } from '@/components/app/AppProvider'
import { costStructure, sum, type ExpenseRow } from '@/components/partner-dashboard/calc'
import { RankedBars } from '@/components/partner-dashboard/shared'

export function CostTab({ expenses }: { expenses: ExpenseRow[] }) {
  const { fmt } = useApp()
  const rows = useMemo(() => costStructure(expenses), [expenses])
  const total = sum(rows, (r) => r.value)
  const top = rows[0]

  return (
    <div className="space-y-6">
      <StatGrid>
        <StatCard label="Total expenses" sub="all time, base currency" value={fmt(total)} icon={Receipt} tone="primary" />
        <StatCard label="Categories" value={rows.length} icon={Layers} />
        <StatCard label="Largest" sub={top?.label ?? '—'} value={top ? fmt(top.value) : '—'} className="hidden lg:flex" />
        <StatCard label="Share of largest" value={top ? `${top.pct.toFixed(0)}%` : '—'} className="hidden lg:flex" />
      </StatGrid>
      <section>
        <h2 className="mb-3 font-display text-lg font-semibold text-ink">Expenses by category</h2>
        <div className="card p-4">
          <RankedBars rows={rows} format={fmt} emptyText="No expenses recorded yet." />
        </div>
      </section>
    </div>
  )
}
