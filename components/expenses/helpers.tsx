'use client'

import { formatMoney } from '@/lib/format'
import { useApp } from '@/components/app/AppProvider'
import type { BadgeTone } from '@/components/ui/Badge'
import type { Expense, LegalStatus } from '@/lib/types'

/** Absolute amount in the organisation's base currency (falls back to the raw amount). */
export function expenseBase(e: Pick<Expense, 'amount' | 'amount_base'>): number {
  return Math.abs(Number(e.amount_base ?? e.amount ?? 0))
}

export function isForeign(e: Pick<Expense, 'currency'>, base: string) {
  return !!e.currency && e.currency.toUpperCase() !== base.toUpperCase()
}

export function legalTone(status: LegalStatus | string | null | undefined): BadgeTone {
  switch (status) {
    case 'Accepted':
      return 'success'
    case 'Clarification Needed':
      return 'warning'
    case 'Rejected':
      return 'danger'
    default:
      return 'info'
  }
}

/** "$120 ≈ €107" for foreign-currency expenses, plain base amount otherwise. */
export function ExpenseAmount({ expense, className }: { expense: Pick<Expense, 'amount' | 'amount_base' | 'currency'>; className?: string }) {
  const { fmt, baseCurrency } = useApp()
  if (!isForeign(expense, baseCurrency)) return <span className={className}>{fmt(expenseBase(expense))}</span>
  const original = formatMoney(Math.abs(Number(expense.amount ?? 0)), expense.currency!.toUpperCase())
  return (
    <span className={className}>
      {original}{' '}
      <span className="whitespace-nowrap text-xs font-normal text-muted">{expense.amount_base != null ? `≈ ${fmt(Math.abs(expense.amount_base))}` : '· no rate'}</span>
    </span>
  )
}
