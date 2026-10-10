'use client'

import { useState } from 'react'
import { cn, MONTHS, MONTHS_LONG } from '@/lib/format'

/**
 * Twelve-month revenue vs expenses bars built from plain divs.
 * Revenue wears the primary colour, expenses the muted ink; both series are
 * named in the legend and every month has a hover/tap readout and a table view.
 */
export function MonthlyBars({ revenue, expenses, year, today, fmt }: { revenue: number[]; expenses: number[]; year: number; today: string; fmt: (n: number) => string }) {
  const [showTable, setShowTable] = useState(false)
  const [focus, setFocus] = useState<number | null>(null)

  const max = Math.max(1, ...revenue, ...expenses)
  const currentMonth = Number(today.slice(0, 4)) === year ? Number(today.slice(5, 7)) : 0
  const sum = (arr: number[]) => arr.reduce((s, n) => s + n, 0)
  const pct = (n: number) => (n > 0 ? Math.max(2, (n / max) * 100) : 0)
  const hasData = revenue.some((n) => n > 0) || expenses.some((n) => n > 0)

  const readout =
    focus === null ? (
      <span>
        Revenue <strong className="tabular text-ink">{fmt(sum(revenue))}</strong> · Expenses <strong className="tabular text-ink">{fmt(sum(expenses))}</strong>
      </span>
    ) : (
      <span>
        {MONTHS_LONG[focus]} {year}: revenue <strong className="tabular text-ink">{fmt(revenue[focus] ?? 0)}</strong> · expenses <strong className="tabular text-ink">{fmt(expenses[focus] ?? 0)}</strong>
      </span>
    )

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-primary" aria-hidden /> Revenue
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-muted" aria-hidden /> Expenses
          </span>
        </div>
        <button type="button" className="btn-ghost btn-sm" onClick={() => setShowTable((v) => !v)} aria-expanded={showTable}>
          {showTable ? 'Show chart' : 'Show table'}
        </button>
      </div>

      {showTable ? (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Month</th>
                <th className="text-right">Revenue</th>
                <th className="text-right">Expenses</th>
                <th className="text-right">Net</th>
              </tr>
            </thead>
            <tbody>
              {MONTHS.map((m, i) => {
                const r = revenue[i] ?? 0
                const e = expenses[i] ?? 0
                return (
                  <tr key={m}>
                    <td className={cn(i + 1 === currentMonth && 'font-semibold text-primary')}>
                      {m} {year}
                    </td>
                    <td className="text-right tabular">{fmt(r)}</td>
                    <td className="text-right tabular">{fmt(e)}</td>
                    <td className={cn('text-right tabular font-medium', r - e < 0 ? 'text-danger' : 'text-success')}>{fmt(r - e)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          <div className="flex items-end gap-1 sm:gap-2" role="img" aria-label={`Monthly revenue and expenses for ${year}`} onMouseLeave={() => setFocus(null)}>
            {MONTHS.map((m, i) => {
              const r = revenue[i] ?? 0
              const e = expenses[i] ?? 0
              const active = focus === i
              return (
                <button
                  type="button"
                  key={m}
                  onMouseEnter={() => setFocus(i)}
                  onFocus={() => setFocus(i)}
                  onClick={() => setFocus((f) => (f === i ? null : i))}
                  title={`${MONTHS_LONG[i]} ${year}: revenue ${fmt(r)} · expenses ${fmt(e)}`}
                  className={cn('flex min-w-0 flex-1 flex-col items-center gap-1 rounded-lg px-0.5 pt-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', active && 'bg-surface-2')}
                >
                  <div className="flex h-36 w-full items-end justify-center gap-0.5">
                    <div className={cn('w-full max-w-[14px] rounded-t bg-primary transition-opacity', focus !== null && !active && 'opacity-60')} style={{ height: `${pct(r)}%` }} />
                    <div className={cn('w-full max-w-[14px] rounded-t bg-muted transition-opacity', focus !== null && !active && 'opacity-60')} style={{ height: `${pct(e)}%` }} />
                  </div>
                  <span className={cn('text-[10px] leading-none', i + 1 === currentMonth ? 'font-semibold text-primary' : 'text-muted')}>
                    {m.slice(0, 1)}
                    <span className="hidden sm:inline">{m.slice(1)}</span>
                  </span>
                </button>
              )
            })}
          </div>
          <div className="mt-3 text-xs text-muted" aria-live="polite">
            {hasData ? readout : `No revenue or expenses recorded for ${year} yet.`}
          </div>
        </>
      )}
    </div>
  )
}
