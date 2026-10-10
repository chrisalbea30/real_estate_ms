'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Banknote, FileX, Landmark, Receipt, Scale, Wallet } from 'lucide-react'
import { PageHeader, Section } from '@/components/ui/PageHeader'
import { StatCard, StatGrid } from '@/components/ui/StatCard'
import { Badge, statusTone } from '@/components/ui/Badge'
import { useApp } from '@/components/app/AppProvider'
import { cn, daysBetween, formatDate, formatDateTime, yearOf } from '@/lib/format'
import { MonthlyBars } from '@/components/overview/MonthlyBars'
import { TASK_STATUSES, type AccountBalance, type Expense, type FoundingContribution, type Guest, type Revenue, type Task } from '@/lib/types'

export type OverviewTask = Pick<Task, 'status'>
export type OverviewGuest = Pick<Guest, 'id' | 'room' | 'room_id' | 'guest_name' | 'check_in' | 'check_out' | 'amount_thb_stay' | 'payment'>
export type OverviewExpense = Pick<Expense, 'amount' | 'amount_base' | 'currency' | 'payment_date' | 'file_url'>
export type OverviewRevenue = Pick<Revenue, 'amount_thb' | 'date'>
export type OverviewFunding = Pick<FoundingContribution, 'amount_thb' | 'date'>

/** Expense amount in the base currency (amount_base when converted, else the raw amount), always positive. */
export function expenseBase(e: Pick<Expense, 'amount' | 'amount_base'>) {
  return Math.abs(Number(e.amount_base ?? e.amount ?? 0))
}

function balanceOf(g: Pick<Guest, 'amount_thb_stay' | 'payment'>) {
  return Number(g.amount_thb_stay ?? 0) - Number(g.payment ?? 0)
}

type YearSelection = 'all' | number[]

export function OverviewClient({
  todos,
  guests,
  expenses,
  revenue,
  founding,
  accounts,
}: {
  todos: OverviewTask[]
  guests: OverviewGuest[]
  expenses: OverviewExpense[]
  revenue: OverviewRevenue[]
  founding: OverviewFunding[]
  accounts: AccountBalance[]
}) {
  const { fmt, today, settings, rooms, can, property } = useApp()
  const currentYear = Number(today.slice(0, 4))
  const [selection, setSelection] = useState<YearSelection>('all')

  // Years present in the data plus the current year, newest first. No hard-coded list.
  const years = useMemo(() => {
    const set = new Set<number>([currentYear])
    for (const e of expenses) {
      const y = yearOf(e.payment_date)
      if (y) set.add(y)
    }
    for (const r of revenue) {
      const y = yearOf(r.date)
      if (y) set.add(y)
    }
    for (const f of founding) {
      const y = yearOf(f.date)
      if (y) set.add(y)
    }
    return [...set].sort((a, b) => b - a)
  }, [expenses, revenue, founding, currentYear])

  const allSelected = selection === 'all' || years.every((y) => selection.includes(y))
  const selectedYears = selection === 'all' ? years : selection

  const toggleYear = (y: number) =>
    setSelection((cur) => {
      if (cur === 'all') return [y]
      if (cur.includes(y)) return cur.length === 1 ? cur : cur.filter((x) => x !== y) // cannot deselect the last one
      const next = [...cur, y]
      return years.every((x) => next.includes(x)) ? 'all' : next
    })

  // With "All" selected, rows without a date are included too.
  const totals = useMemo(() => {
    const inYears = (date: string | null | undefined) => {
      if (allSelected) return true
      const y = yearOf(date)
      return y != null && selectedYears.includes(y)
    }
    const exp = expenses.filter((e) => inYears(e.payment_date)).reduce((s, e) => s + expenseBase(e), 0)
    const rev = revenue.filter((r) => inYears(r.date)).reduce((s, r) => s + Number(r.amount_thb ?? 0), 0)
    const fund = founding.filter((f) => inYears(f.date)).reduce((s, f) => s + Number(f.amount_thb ?? 0), 0)
    return { exp, rev, fund, net: rev + fund - exp }
  }, [expenses, revenue, founding, allSelected, selectedYears])

  // Chart year: the single selected year, otherwise the current year.
  const chartYear = selection !== 'all' && selection.length === 1 ? selection[0]! : currentYear
  const monthly = useMemo(() => {
    const rev = Array.from({ length: 12 }, () => 0)
    const exp = Array.from({ length: 12 }, () => 0)
    for (const r of revenue) {
      if (yearOf(r.date) !== chartYear) continue
      const i = Number(r.date.slice(5, 7)) - 1
      if (i >= 0 && i < 12) rev[i] = (rev[i] ?? 0) + Number(r.amount_thb ?? 0)
    }
    for (const e of expenses) {
      if (!e.payment_date || yearOf(e.payment_date) !== chartYear) continue
      const i = Number(e.payment_date.slice(5, 7)) - 1
      if (i >= 0 && i < 12) exp[i] = (exp[i] ?? 0) + expenseBase(e)
    }
    return { rev, exp }
  }, [revenue, expenses, chartYear])

  // Cash position: ledger balances plus the receipts gap (all expenses, no year filter).
  const cash = accounts.reduce((s, a) => s + Number(a.balance ?? 0), 0)
  const noInvoice = expenses.filter((e) => !e.file_url)
  const noInvoiceTotal = noInvoice.reduce((s, e) => s + expenseBase(e), 0)

  // Guest lists use the property's "today" and string comparison only.
  const arrivalsWindow = settings.alerts?.arrivals_window_days ?? 7
  const roomName = (g: OverviewGuest) => rooms.find((r) => r.id === g.room_id)?.name ?? rooms.find((r) => r.number === g.room)?.name ?? `Room ${g.room}`
  const inHouse = guests.filter((g) => g.check_in <= today && g.check_out > today).sort((a, b) => a.check_out.localeCompare(b.check_out))
  const arriving = guests
    .filter((g) => {
      const d = daysBetween(today, g.check_in)
      return d > 0 && d <= arrivalsWindow
    })
    .sort((a, b) => a.check_in.localeCompare(b.check_in))

  const taskCounts = TASK_STATUSES.map((status) => ({ status, count: todos.filter((t) => t.status === status).length }))
  const periodLabel = allSelected ? 'All time' : [...selectedYears].sort((a, b) => a - b).join(', ')
  const chip = (active: boolean) => cn('badge border px-3 py-1 transition', active ? 'border-primary bg-primary text-primary-fg' : 'border-line bg-surface text-ink-2 hover:bg-surface-2')

  return (
    <div>
      <PageHeader
        title="Overview"
        subtitle={`${property.name} · ${formatDate(today)}`}
        actions={
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Years">
            <button type="button" className={chip(allSelected)} aria-pressed={allSelected} onClick={() => setSelection('all')}>
              All
            </button>
            {years.map((y) => {
              const active = !allSelected && selectedYears.includes(y)
              return (
                <button key={y} type="button" className={chip(active)} aria-pressed={active} onClick={() => toggleYear(y)}>
                  {y}
                </button>
              )
            })}
          </div>
        }
      />

      <StatGrid className="mb-6">
        <StatCard label="Total revenue" value={fmt(totals.rev)} icon={Banknote} tone="primary" sub={periodLabel} />
        <StatCard label="Total expenses" value={fmt(totals.exp)} icon={Receipt} tone="warning" sub={periodLabel} />
        <StatCard label="Capital funded" value={fmt(totals.fund)} icon={Landmark} tone="info" sub={periodLabel} />
        <StatCard label="Net position" value={fmt(totals.net)} icon={Scale} tone={totals.net >= 0 ? 'success' : 'danger'} sub="Revenue + capital − expenses" />
      </StatGrid>

      <Section title={`Revenue vs expenses ${chartYear}`} description="By month, in the base currency">
        <div className="card p-4">
          <MonthlyBars revenue={monthly.rev} expenses={monthly.exp} year={chartYear} today={today} fmt={fmt} />
        </div>
      </Section>

      <Section
        title="Cash position"
        description="Balances come from the ledger; edit them in Accounts."
        actions={
          can('accounts') && (
            <Link href="/app/accounts" className="btn-secondary btn-sm">
              Accounts <ArrowRight className="h-4 w-4" />
            </Link>
          )
        }
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <StatCard label="Total cash on hand" value={fmt(cash)} icon={Wallet} tone={cash >= 0 ? 'primary' : 'danger'} sub={`${accounts.length} account${accounts.length === 1 ? '' : 's'}`} />
          {can('expenses') ? (
            <Link href="/app/expenses" className="block">
              <StatCard label="No invoice / receipt" value={fmt(noInvoiceTotal)} icon={FileX} tone={noInvoice.length ? 'warning' : 'default'} sub={`${noInvoice.length} expense${noInvoice.length === 1 ? '' : 's'} without a file · open Expenses`} className="h-full hover:border-primary/40 hover:shadow-pop transition" />
            </Link>
          ) : (
            <StatCard label="No invoice / receipt" value={fmt(noInvoiceTotal)} icon={FileX} tone={noInvoice.length ? 'warning' : 'default'} sub={`${noInvoice.length} expense${noInvoice.length === 1 ? '' : 's'} without a file`} />
          )}
        </div>
        {accounts.length === 0 ? (
          <div className="card mt-3 p-4 text-sm text-muted">No accounts yet. Create them in Accounts to track cash per bank, wallet or cash box.</div>
        ) : (
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {accounts.map((a) => (
              <div key={a.id} className="card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-ink">{a.name}</div>
                    <div className="text-xs capitalize text-muted">
                      {a.type}
                      {a.currency ? ` · ${a.currency}` : ''}
                    </div>
                  </div>
                  <Badge>
                    {a.movement_count} mov.
                  </Badge>
                </div>
                <div className={cn('mt-2 font-display text-xl font-semibold tabular', Number(a.balance) < 0 ? 'text-danger' : 'text-ink')}>{fmt(a.balance)}</div>
                <div className="mt-1 text-xs text-muted">{a.last_movement_at ? `Last movement ${formatDateTime(a.last_movement_at, property.timezone)}` : 'No movements yet'}</div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section
          title="In-house now"
          description={`${inHouse.length} guest${inHouse.length === 1 ? '' : 's'} staying tonight`}
          actions={
            can('guests') && (
              <Link href="/app/guests" className="btn-ghost btn-sm">
                Guests <ArrowRight className="h-4 w-4" />
              </Link>
            )
          }
        >
          {inHouse.length === 0 ? (
            <div className="card p-4 text-sm text-muted">Nobody is in-house tonight.</div>
          ) : (
            <ul className="card divide-y divide-line">
              {inHouse.map((g) => {
                const bal = balanceOf(g)
                return (
                  <li key={g.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                    <span className="inline-block w-20 shrink-0 truncate rounded-lg bg-primary-soft px-2 py-1 text-center text-xs font-semibold text-primary-soft-fg">{roomName(g)}</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{g.guest_name}</div>
                      <div className="text-xs text-muted">Check-out {formatDate(g.check_out)}</div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className={cn('font-semibold tabular', bal > 0 ? 'text-danger' : 'text-success')}>{fmt(bal)}</div>
                      <div className="text-[11px] text-muted">{bal > 0 ? 'balance due' : 'settled'}</div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </Section>

        <Section title={`Arriving in ${arrivalsWindow} days`} description={`${arriving.length} booking${arriving.length === 1 ? '' : 's'}`}>
          {arriving.length === 0 ? (
            <div className="card p-4 text-sm text-muted">No arrivals in the next {arrivalsWindow} days.</div>
          ) : (
            <ul className="card divide-y divide-line">
              {arriving.map((g) => (
                <li key={g.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                  <span className="inline-block w-20 shrink-0 truncate rounded-lg bg-primary-soft px-2 py-1 text-center text-xs font-semibold text-primary-soft-fg">{roomName(g)}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{g.guest_name}</div>
                    <div className="text-xs text-muted">
                      Check-in {formatDate(g.check_in)} · in {daysBetween(today, g.check_in)}d
                    </div>
                  </div>
                  <span className="shrink-0 font-semibold tabular">{fmt(g.amount_thb_stay)}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      <Section
        title="Tasks"
        description={`${todos.length} task${todos.length === 1 ? '' : 's'} across the organisation`}
        actions={
          can('tasks') && (
            <Link href="/app/tasks" className="btn-ghost btn-sm">
              Tasks <ArrowRight className="h-4 w-4" />
            </Link>
          )
        }
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {taskCounts.map(({ status, count }) => {
            const inner = (
              <>
                <Badge tone={statusTone(status)}>{status}</Badge>
                <div className="mt-2 font-display text-2xl font-semibold tabular text-ink">{count}</div>
              </>
            )
            return can('tasks') ? (
              <Link key={status} href="/app/tasks" className="card p-4 transition hover:border-primary/40 hover:shadow-pop">
                {inner}
              </Link>
            ) : (
              <div key={status} className="card p-4">
                {inner}
              </div>
            )
          })}
        </div>
      </Section>
    </div>
  )
}
