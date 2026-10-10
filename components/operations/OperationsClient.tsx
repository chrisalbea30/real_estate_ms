'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Banknote, BedDouble, CalendarCheck, CircleCheck, ClipboardList, DoorOpen, ExternalLink, FileX, Flame, LogIn, LogOut, ShieldAlert, TrendingUp, TriangleAlert, Wallet } from 'lucide-react'
import { PageHeader, Section } from '@/components/ui/PageHeader'
import { StatCard, StatGrid } from '@/components/ui/StatCard'
import { Tabs } from '@/components/ui/Tabs'
import { Badge, statusTone } from '@/components/ui/Badge'
import { useApp } from '@/components/app/AppProvider'
import { extinguisherStatus } from '@/components/rooms/RoomDetailClient'
import { addDays, cn, daysBetween, formatDate, formatDateTime, formatMonth, formatPct, nightsBetween, revenueSourceGroup } from '@/lib/format'
import type { AccountBalance, Expense, FireExtinguisher, Guest, Revenue, Room, Task } from '@/lib/types'

export type OpsGuest = Pick<Guest, 'id' | 'room' | 'room_id' | 'guest_name' | 'guest_count' | 'check_in' | 'check_out' | 'amount_thb_stay' | 'payment' | 'tm30' | 'booking_source' | 'phone'>
export type OpsTask = Pick<Task, 'id' | 'topic' | 'project' | 'department' | 'responsible_person' | 'target_date' | 'status' | 'status_notes'>
export type OpsRevenue = Pick<Revenue, 'amount_thb' | 'date' | 'type'>
export type OpsExpense = Pick<Expense, 'id' | 'amount_base' | 'amount' | 'currency' | 'payment_date' | 'category' | 'supplier' | 'document_number' | 'file_url'>
type RoomLite = Pick<Room, 'name' | 'number'>
/** PostgREST embeds the to-one `rooms` relation as an object; an array is tolerated in case the FK is ever read as to-many. */
export type OpsExtinguisher = FireExtinguisher & { rooms: RoomLite | RoomLite[] | null }

type TabKey = 'today' | 'bookings' | 'revenue' | 'tasks' | 'cash'

const OUTSTANDING_WINDOW_DAYS = 90
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const balanceOf = (g: Pick<Guest, 'amount_thb_stay' | 'payment'>) => Number(g.amount_thb_stay ?? 0) - Number(g.payment ?? 0)
const expenseBase = (e: Pick<Expense, 'amount' | 'amount_base'>) => Math.abs(Number(e.amount_base ?? e.amount ?? 0))
const embeddedRoom = (e: OpsExtinguisher): RoomLite | null => (Array.isArray(e.rooms) ? (e.rooms[0] ?? null) : e.rooms)
const findRoom = (rooms: Room[], g: Pick<Guest, 'room' | 'room_id'>) => rooms.find((r) => r.id === g.room_id) ?? rooms.find((r) => r.number === g.room)
const weekdayOf = (iso: string) => WEEKDAYS[new Date(`${iso}T00:00:00Z`).getUTCDay()] ?? ''
const byKey = <T,>(key: (x: T) => string) => (a: T, b: T) => key(a).localeCompare(key(b))

export function OperationsClient({
  guests,
  todos,
  revenue,
  accounts,
  expenses,
  extinguishers,
}: {
  guests: OpsGuest[]
  todos: OpsTask[]
  revenue: OpsRevenue[]
  accounts: AccountBalance[]
  expenses: OpsExpense[]
  extinguishers: OpsExtinguisher[]
}) {
  const { fmt, today, settings, rooms, can, property, baseCurrency } = useApp()
  const [tab, setTab] = useState<TabKey>('today')
  const [includeOlder, setIncludeOlder] = useState(false)

  const totalRooms = rooms.filter((r) => r.active).length
  const warnDays = settings.alerts?.fire_extinguisher_days ?? 30
  const roomName = (g: OpsGuest) => findRoom(rooms, g)?.name ?? `Room ${g.room}`

  const ops = useMemo(() => {
    const checkIns = guests.filter((g) => g.check_in === today)
    const checkOuts = guests.filter((g) => g.check_out === today)
    const inHouse = guests.filter((g) => g.check_in <= today && g.check_out > today)
    // Rooms occupied tonight (two bookings in one room count once).
    const occupied = new Set(inHouse.map((g) => findRoom(rooms, g)?.id ?? `n:${g.room}`)).size
    const available = Math.max(0, totalRooms - occupied)
    const occupancyPct = totalRooms > 0 ? (occupied / totalRooms) * 100 : 0
    const tm30Pending = inHouse.filter((g) => !g.tm30)

    const alerts = extinguishers
      .map((e) => ({ ...e, state: extinguisherStatus(e.expiry_date, today, warnDays), roomLabel: embeddedRoom(e)?.name ?? 'Unknown room' }))
      .filter((e) => e.state.days <= warnDays)
      .sort(byKey((e) => e.expiry_date))

    const arriving14 = guests
      .filter((g) => {
        const d = daysBetween(today, g.check_in)
        return d > 0 && d <= 14
      })
      .sort(byKey((g) => g.check_in))
    const departing7 = guests
      .filter((g) => {
        const d = daysBetween(today, g.check_out)
        return d >= 0 && d <= 7
      })
      .sort(byKey((g) => g.check_out))

    const ym = today.slice(0, 7)
    const monthRows = revenue.filter((r) => (r.date ?? '').startsWith(ym))
    const revenueMonth = monthRows.reduce((s, r) => s + Number(r.amount_thb ?? 0), 0)
    const bySource = new Map<string, number>()
    for (const r of monthRows) {
      const k = revenueSourceGroup(r.type)
      bySource.set(k, (bySource.get(k) ?? 0) + Number(r.amount_thb ?? 0))
    }
    const sources = [...bySource.entries()].sort((a, b) => b[1] - a[1])

    const cutoff = addDays(today, -OUTSTANDING_WINDOW_DAYS)
    const allOutstanding = guests.filter((g) => balanceOf(g) > 0)
    const older = allOutstanding.filter((g) => g.check_out < cutoff)
    const olderTotal = older.reduce((s, g) => s + balanceOf(g), 0)
    const outstanding = (includeOlder ? allOutstanding : allOutstanding.filter((g) => g.check_out >= cutoff)).sort((a, b) => balanceOf(b) - balanceOf(a))
    const outstandingTotal = outstanding.reduce((s, g) => s + balanceOf(g), 0)

    const open = todos.filter((t) => t.status !== 'Complete')
    const overdue = open.filter((t) => !!t.target_date && t.target_date < today).sort(byKey((t) => t.target_date ?? ''))
    const dueToday = open.filter((t) => t.target_date === today)
    const pending = todos.filter((t) => t.status === 'Pending').length
    const complete = todos.filter((t) => t.status === 'Complete').length

    const cash = accounts.reduce((s, a) => s + Number(a.balance ?? 0), 0)
    const noInvoice = expenses.filter((e) => !e.file_url)
    const noInvoiceTotal = noInvoice.reduce((s, e) => s + expenseBase(e), 0)
    const lastExpenses = [...expenses].sort((a, b) => (b.payment_date ?? '').localeCompare(a.payment_date ?? '')).slice(0, 10)

    return { checkIns, checkOuts, inHouse, occupied, available, occupancyPct, tm30Pending, alerts, arriving14, departing7, ym, monthRows, revenueMonth, sources, older, olderTotal, outstanding, outstandingTotal, overdue, dueToday, pending, complete, cash, noInvoice, noInvoiceTotal, lastExpenses }
  }, [guests, todos, revenue, accounts, expenses, extinguishers, rooms, today, totalRooms, warnDays, includeOlder])

  const tabs = [
    { key: 'today' as const, label: "Today's ops", badge: ops.alerts.length || undefined },
    { key: 'bookings' as const, label: 'Bookings', badge: ops.arriving14.length + ops.departing7.length || undefined },
    { key: 'revenue' as const, label: 'Revenue & collection', badge: ops.outstanding.length || undefined },
    { key: 'tasks' as const, label: 'Tasks & issues', badge: ops.overdue.length + ops.dueToday.length || undefined },
    { key: 'cash' as const, label: 'Cash control', badge: ops.noInvoice.length || undefined },
  ]

  const balanceCell = (g: OpsGuest) => {
    const bal = balanceOf(g)
    return bal > 0 ? <span className="font-semibold tabular text-danger">{fmt(bal)} due</span> : <Badge tone="success">Paid</Badge>
  }
  const tm30Badge = (g: OpsGuest) => <Badge tone={g.tm30 ? 'success' : 'warning'}>TM30 {g.tm30 ? 'filed' : 'pending'}</Badge>
  const guestsLink = can('guests') && (
    <Link href="/app/guests" className="btn-ghost btn-sm">
      Guests <ArrowRight className="h-4 w-4" />
    </Link>
  )
  const tasksLink = can('tasks') && (
    <Link href="/app/tasks" className="btn-ghost btn-sm">
      Tasks <ArrowRight className="h-4 w-4" />
    </Link>
  )

  return (
    <div>
      <PageHeader
        title="Operations"
        subtitle={`${weekdayOf(today)}, ${formatDate(today)} · ${property.name}`}
        actions={settings.external_links?.map((l) => (
          <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="btn-secondary btn-sm">
            <ExternalLink className="h-4 w-4" /> {l.label}
          </a>
        ))}
      />

      <Tabs tabs={tabs} value={tab} onChange={setTab} className="mb-5" />

      {tab === 'today' && (
        <>
          <StatGrid className="mb-6">
            <StatCard label="Check-ins today" value={ops.checkIns.length} icon={LogIn} tone="success" />
            <StatCard label="Check-outs today" value={ops.checkOuts.length} icon={LogOut} tone="warning" />
            <StatCard label="In-house" value={ops.inHouse.length} icon={BedDouble} tone="info" sub={`${ops.occupied} of ${totalRooms} rooms occupied`} />
            <StatCard label="Available" value={ops.available} icon={DoorOpen} tone="primary" sub={`${formatPct(ops.occupancyPct, 0)} occupancy tonight`} />
          </StatGrid>

          <div className="grid gap-6 lg:grid-cols-2">
            <Section title="Arriving today" description={`${ops.checkIns.length} check-in${ops.checkIns.length === 1 ? '' : 's'}`} actions={guestsLink}>
              <GuestList guests={ops.checkIns} roomName={roomName} empty="No arrivals today." sub={(g) => `${nightsBetween(g.check_in, g.check_out)} night${nightsBetween(g.check_in, g.check_out) === 1 ? '' : 's'} · ${g.booking_source ?? 'Direct'}${g.guest_count ? ` · ${g.guest_count} pax` : ''}`} right={tm30Badge} />
            </Section>
            <Section title="Departing today" description={`${ops.checkOuts.length} check-out${ops.checkOuts.length === 1 ? '' : 's'}`}>
              <GuestList guests={ops.checkOuts} roomName={roomName} empty="No departures today." sub={(g) => `Arrived ${formatDate(g.check_in)} · total ${fmt(g.amount_thb_stay)}`} right={balanceCell} />
            </Section>
            <Section title="TM30 pending" description="In-house guests not yet registered with immigration">
              <GuestList guests={ops.tm30Pending} roomName={roomName} empty="Every in-house guest is registered." sub={(g) => `${formatDate(g.check_in)} → ${formatDate(g.check_out)}${g.phone ? ` · ${g.phone}` : ''}`} right={tm30Badge} tone="warning" />
            </Section>
            <Section
              title="Fire safety"
              description={ops.alerts.length ? `${ops.alerts.length} extinguisher${ops.alerts.length === 1 ? '' : 's'} expired or expiring within ${warnDays} days` : `All extinguishers in date for the next ${warnDays} days`}
              actions={
                can('rooms') && (
                  <Link href="/app/rooms" className="btn-ghost btn-sm">
                    Rooms <ArrowRight className="h-4 w-4" />
                  </Link>
                )
              }
            >
              {ops.alerts.length === 0 ? (
                <div className="card flex items-center gap-3 p-4 text-sm text-muted">
                  <ShieldAlert className="h-5 w-5 text-success" /> {extinguishers.length === 0 ? 'No fire extinguishers recorded for this property.' : 'Nothing to do.'}
                </div>
              ) : (
                <ul className="card divide-y divide-line">
                  {ops.alerts.map((e) => (
                    <li key={e.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                      <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', e.state.tone === 'danger' ? 'bg-danger-soft text-danger' : e.state.tone === 'warning' ? 'bg-warning-soft text-warning' : 'bg-success-soft text-success')}>
                        <Flame className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">
                          {e.roomLabel} · {e.location}
                        </div>
                        <div className="text-xs text-muted">
                          Expires {formatDate(e.expiry_date)}
                          {e.serial_number ? ` · ${e.serial_number}` : ''}
                        </div>
                      </div>
                      <Badge tone={e.state.tone}>{e.state.label}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </div>
        </>
      )}

      {tab === 'bookings' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Section title="Arriving in 14 days" description={`${ops.arriving14.length} booking${ops.arriving14.length === 1 ? '' : 's'}`} actions={guestsLink}>
            <GuestList
              guests={ops.arriving14}
              roomName={roomName}
              empty="No arrivals in the next 14 days."
              sub={(g) => `${formatDate(g.check_in)} · in ${daysBetween(today, g.check_in)}d · ${nightsBetween(g.check_in, g.check_out)}n · ${g.booking_source ?? 'Direct'}`}
              right={(g) => (
                <div className="flex flex-col items-end gap-1">
                  <span className="font-semibold tabular">{fmt(g.amount_thb_stay)}</span>
                  {!g.tm30 && <Badge tone="warning">TM30 pending</Badge>}
                </div>
              )}
            />
          </Section>
          <Section title="Departing in 7 days" description="Balance to collect before check-out">
            <GuestList
              guests={ops.departing7}
              roomName={roomName}
              empty="No departures in the next 7 days."
              sub={(g) => {
                const d = daysBetween(today, g.check_out)
                return `Check-out ${formatDate(g.check_out)} · ${d === 0 ? 'today' : d === 1 ? 'tomorrow' : `in ${d}d`}`
              }}
              right={balanceCell}
            />
          </Section>
        </div>
      )}

      {tab === 'revenue' && (
        <>
          <StatGrid className="mb-6">
            <StatCard label="Revenue this month" value={fmt(ops.revenueMonth)} icon={Banknote} tone="primary" sub={`${formatMonth(ops.ym)} · ${ops.monthRows.length} entr${ops.monthRows.length === 1 ? 'y' : 'ies'}`} />
            <StatCard label="Outstanding" value={fmt(ops.outstandingTotal)} icon={Wallet} tone={ops.outstandingTotal > 0 ? 'danger' : 'success'} sub={`${ops.outstanding.length} guest${ops.outstanding.length === 1 ? '' : 's'}${includeOlder ? '' : ` · stays since ${formatDate(addDays(today, -OUTSTANDING_WINDOW_DAYS))}`}`} />
            <StatCard label={`Older than ${OUTSTANDING_WINDOW_DAYS}d`} value={fmt(ops.olderTotal)} icon={TriangleAlert} tone={ops.older.length ? 'warning' : 'default'} sub={`${ops.older.length} long-departed guest${ops.older.length === 1 ? '' : 's'} with a balance`} />
            <StatCard label="In-house receivables" value={fmt(ops.inHouse.reduce((s, g) => s + Math.max(0, balanceOf(g)), 0))} icon={BedDouble} tone="info" sub="Due from guests staying tonight" />
          </StatGrid>

          <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
            <Section title="By source this month" description={formatMonth(ops.ym)}>
              {ops.sources.length === 0 ? (
                <div className="card p-4 text-sm text-muted">No revenue recorded this month yet.</div>
              ) : (
                <ul className="card divide-y divide-line">
                  {ops.sources.map(([source, amount]) => {
                    const share = ops.revenueMonth > 0 ? (amount / ops.revenueMonth) * 100 : 0
                    return (
                      <li key={source} className="px-4 py-3 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-medium">{source}</span>
                          <span className="tabular">
                            {fmt(amount)} <span className="text-xs text-muted">({formatPct(share, 0)})</span>
                          </span>
                        </div>
                        <div className="mt-1.5 h-1.5 w-full rounded-full bg-surface-2">
                          <div className="h-1.5 rounded-full bg-primary" style={{ width: `${Math.max(2, share)}%` }} />
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </Section>

            <Section
              title="Outstanding balances"
              description="Stay total minus payments received, largest first"
              actions={
                <label className="flex items-center gap-2 text-sm text-ink-2">
                  <input type="checkbox" className="h-4 w-4 accent-[var(--primary)]" checked={includeOlder} onChange={(e) => setIncludeOlder(e.target.checked)} />
                  Include older ({ops.older.length})
                </label>
              }
            >
              <GuestList
                guests={ops.outstanding}
                roomName={roomName}
                empty="Nothing outstanding. Every guest has settled."
                sub={(g) => `${formatDate(g.check_in)} → ${formatDate(g.check_out)} · ${g.check_out <= today ? 'checked out' : g.check_in <= today ? 'in-house' : 'upcoming'}`}
                right={(g) => (
                  <div className="text-right">
                    <div className="font-semibold tabular text-danger">{fmt(balanceOf(g))}</div>
                    <div className="text-[11px] text-muted">
                      {fmt(g.payment)} of {fmt(g.amount_thb_stay)} paid
                    </div>
                  </div>
                )}
                footer={
                  ops.outstanding.length > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted">
                        {ops.outstanding.length} guest{ops.outstanding.length === 1 ? '' : 's'}
                      </span>
                      <span>
                        Total <strong className="tabular text-danger">{fmt(ops.outstandingTotal)}</strong>
                      </span>
                    </div>
                  )
                }
              />
            </Section>
          </div>
        </>
      )}

      {tab === 'tasks' && (
        <>
          <StatGrid className="mb-6">
            <StatCard label="Overdue" value={ops.overdue.length} icon={TriangleAlert} tone={ops.overdue.length ? 'danger' : 'default'} sub="Past target date, not complete" />
            <StatCard label="Due today" value={ops.dueToday.length} icon={CalendarCheck} tone={ops.dueToday.length ? 'warning' : 'default'} />
            <StatCard label="Pending" value={ops.pending} icon={ClipboardList} tone="info" />
            <StatCard label="Complete" value={ops.complete} icon={CircleCheck} tone="success" sub={`of ${todos.length} task${todos.length === 1 ? '' : 's'}`} />
          </StatGrid>
          <div className="grid gap-6 lg:grid-cols-2">
            <Section title="Overdue" description={`${ops.overdue.length} task${ops.overdue.length === 1 ? '' : 's'}`} actions={tasksLink}>
              <TaskList tasks={ops.overdue} today={today} empty="Nothing overdue." linked={can('tasks')} />
            </Section>
            <Section title="Due today" description={`${ops.dueToday.length} task${ops.dueToday.length === 1 ? '' : 's'}`}>
              <TaskList tasks={ops.dueToday} today={today} empty="Nothing due today." linked={can('tasks')} />
            </Section>
          </div>
        </>
      )}

      {tab === 'cash' && (
        <>
          <StatGrid className="mb-6">
            <StatCard label="Cash on hand" value={fmt(ops.cash)} icon={Wallet} tone={ops.cash >= 0 ? 'primary' : 'danger'} sub={`${accounts.length} active account${accounts.length === 1 ? '' : 's'}`} />
            {can('expenses') ? (
              <Link href="/app/expenses" className="block">
                <StatCard label="No invoice / receipt" value={fmt(ops.noInvoiceTotal)} icon={FileX} tone={ops.noInvoice.length ? 'warning' : 'default'} sub={`${ops.noInvoice.length} expense${ops.noInvoice.length === 1 ? '' : 's'} without a file`} className="h-full transition hover:border-primary/40 hover:shadow-pop" />
              </Link>
            ) : (
              <StatCard label="No invoice / receipt" value={fmt(ops.noInvoiceTotal)} icon={FileX} tone={ops.noInvoice.length ? 'warning' : 'default'} sub={`${ops.noInvoice.length} expense${ops.noInvoice.length === 1 ? '' : 's'} without a file`} />
            )}
            <StatCard label="Guest receivables" value={fmt(ops.outstandingTotal)} icon={Banknote} tone={ops.outstandingTotal > 0 ? 'danger' : 'success'} sub={includeOlder ? 'All stays with a balance' : `Stays in the last ${OUTSTANDING_WINDOW_DAYS} days`} />
            <StatCard label="Revenue this month" value={fmt(ops.revenueMonth)} icon={TrendingUp} tone="success" sub={formatMonth(ops.ym)} />
          </StatGrid>

          <Section
            title="Accounts"
            description="Ledger balances per account"
            actions={
              can('accounts') && (
                <Link href="/app/accounts" className="btn-ghost btn-sm">
                  Accounts <ArrowRight className="h-4 w-4" />
                </Link>
              )
            }
          >
            {accounts.length === 0 ? (
              <div className="card p-4 text-sm text-muted">No accounts yet.</div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
                      <Badge>{a.movement_count} mov.</Badge>
                    </div>
                    <div className={cn('mt-2 font-display text-xl font-semibold tabular', Number(a.balance) < 0 ? 'text-danger' : 'text-ink')}>{fmt(a.balance)}</div>
                    <div className="mt-1 text-xs text-muted">{a.last_movement_at ? `Last movement ${formatDateTime(a.last_movement_at, property.timezone)}` : 'No movements yet'}</div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section
            title="Latest expenses"
            description="Last 10 by payment date"
            actions={
              can('expenses') && (
                <Link href="/app/expenses" className="btn-ghost btn-sm">
                  Expenses <ArrowRight className="h-4 w-4" />
                </Link>
              )
            }
          >
            {ops.lastExpenses.length === 0 ? (
              <div className="card p-4 text-sm text-muted">No expenses recorded yet.</div>
            ) : (
              <ul className="card divide-y divide-line">
                {ops.lastExpenses.map((e) => (
                  <li key={e.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                    <span className="w-20 shrink-0 text-xs text-muted tabular">{formatDate(e.payment_date)}</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{e.supplier || e.category || 'Expense'}</div>
                      <div className="truncate text-xs text-muted">
                        {[e.category, e.document_number].filter(Boolean).join(' · ') || '—'}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="font-semibold tabular">{fmt(expenseBase(e))}</span>
                      {e.currency && e.currency !== baseCurrency && (
                        <span className="text-[11px] text-muted tabular">
                          {Number(e.amount ?? 0).toLocaleString('en-US')} {e.currency}
                        </span>
                      )}
                      {!e.file_url && <Badge tone="warning">No invoice</Badge>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </>
      )}
    </div>
  )
}

function GuestList({
  guests,
  roomName,
  empty,
  sub,
  right,
  footer,
  tone,
}: {
  guests: OpsGuest[]
  roomName: (g: OpsGuest) => string
  empty: string
  sub: (g: OpsGuest) => React.ReactNode
  right: (g: OpsGuest) => React.ReactNode
  footer?: React.ReactNode
  tone?: 'warning'
}) {
  if (guests.length === 0) return <div className="card p-4 text-sm text-muted">{empty}</div>
  return (
    <div className={cn('card overflow-hidden', tone === 'warning' && 'border-warning/40')}>
      <ul className="divide-y divide-line">
        {guests.map((g) => (
          <li key={g.id} className="flex items-center gap-3 px-4 py-3 text-sm">
            <span className="inline-block w-20 shrink-0 truncate rounded-lg bg-primary-soft px-2 py-1 text-center text-xs font-semibold text-primary-soft-fg">{roomName(g)}</span>
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{g.guest_name}</div>
              <div className="truncate text-xs text-muted">{sub(g)}</div>
            </div>
            <div className="shrink-0 text-right">{right(g)}</div>
          </li>
        ))}
      </ul>
      {footer && <div className="border-t border-line bg-surface-2/60 px-4 py-3">{footer}</div>}
    </div>
  )
}

function TaskList({ tasks, today, empty, linked }: { tasks: OpsTask[]; today: string; empty: string; linked: boolean }) {
  if (tasks.length === 0) return <div className="card p-4 text-sm text-muted">{empty}</div>
  return (
    <ul className="card divide-y divide-line">
      {tasks.map((t) => {
        const late = t.target_date ? daysBetween(t.target_date, today) : 0
        const body = (
          <>
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{t.topic}</div>
              <div className="truncate text-xs text-muted">{[t.department, t.project, t.responsible_person].filter(Boolean).join(' · ') || 'Unassigned'}</div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <Badge tone={statusTone(t.status)}>{t.status}</Badge>
              {t.target_date && <span className={cn('text-[11px] tabular', late > 0 ? 'font-semibold text-danger' : 'text-muted')}>{late > 0 ? `${late}d overdue` : late === 0 ? 'Due today' : formatDate(t.target_date)}</span>}
            </div>
          </>
        )
        return (
          <li key={t.id}>
            {linked ? (
              <Link href="/app/tasks" className="flex items-center gap-3 px-4 py-3 text-sm transition hover:bg-surface-2">
                {body}
              </Link>
            ) : (
              <div className="flex items-center gap-3 px-4 py-3 text-sm">{body}</div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
