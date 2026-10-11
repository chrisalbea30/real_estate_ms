'use client'

// Presentational pieces shared by the budget matrices: a horizontally
// scrolling table with a sticky first column and 44px tappable cells.

import { cn, MONTHS } from '@/lib/format'

export const TH = 'border-b border-line bg-surface-2 px-2 py-2 text-xs font-semibold uppercase tracking-wide text-muted whitespace-nowrap'
export const TD = 'border-b border-line px-1 py-0.5 align-middle text-right'
export const TD_LABEL = 'border-b border-line px-3 py-2 align-middle text-left whitespace-nowrap'
export const STICKY = 'sticky left-0 z-10 bg-surface'
export const STICKY_HEAD = 'sticky left-0 z-20 bg-surface-2'
export const STICKY_SOFT = 'sticky left-0 z-10 bg-surface-2'

export function MatrixTable({ children, className, minWidth = 'min-w-[66rem]' }: { children: React.ReactNode; className?: string; minWidth?: string }) {
  return (
    <div className={cn('card overflow-x-auto', className)}>
      <table className={cn('w-full border-collapse text-sm tabular', minWidth)}>{children}</table>
    </div>
  )
}

export function MonthHeadRow({ first, last = 'Total', firstWidth = 'min-w-[11rem]' }: { first: React.ReactNode; last?: React.ReactNode | null; firstWidth?: string }) {
  return (
    <thead>
      <tr>
        <th className={cn(TH, 'text-left', STICKY_HEAD, firstWidth)}>{first}</th>
        {MONTHS.map((m) => (
          <th key={m} className={cn(TH, 'min-w-[5.75rem] text-right')}>
            {m}
          </th>
        ))}
        {last !== null && <th className={cn(TH, 'min-w-[6.5rem] text-right')}>{last}</th>}
      </tr>
    </thead>
  )
}

export function MatrixCell({ value, filled, onClick, title, className }: { value: React.ReactNode; filled: boolean; onClick?: () => void; title?: string; className?: string }) {
  const cls = cn(
    'flex h-11 w-full min-w-[5.5rem] items-center justify-end rounded-lg px-2 text-right transition',
    filled ? 'text-ink' : 'text-muted/50',
    onClick && 'hover:bg-primary-soft/70 active:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
    className,
  )
  if (!onClick) return <div className={cls}>{value}</div>
  return (
    <button type="button" className={cls} onClick={onClick} title={title}>
      {value}
    </button>
  )
}

/** A bold totals row (per-month values + overall total) with a sticky label. */
export function TotalsRow({ label, months, total, soft, className, format }: { label: React.ReactNode; months: number[]; total: number; soft?: boolean; className?: string; format: (v: number) => string }) {
  const bg = soft ? 'bg-surface-2' : 'bg-primary-tint'
  return (
    <tr className={cn('font-semibold', className)}>
      <td className={cn(TD_LABEL, 'sticky left-0 z-10', bg)}>{label}</td>
      {months.map((v, i) => (
        <td key={i} className={cn(TD, bg, 'px-3 py-2.5')}>
          {v ? format(v) : '—'}
        </td>
      ))}
      <td className={cn(TD, bg, 'px-3 py-2.5')}>{format(total)}</td>
    </tr>
  )
}
