'use client'

import { useMemo } from 'react'
import { Wallet, CalendarCheck, Banknote, Receipt } from 'lucide-react'
import { StatCard, StatGrid } from '@/components/ui/StatCard'
import { DataTable, CardRow, CardTitle, type Column } from '@/components/ui/DataTable'
import { useApp } from '@/components/app/AppProvider'
import { formatDate, nightsBetween } from '@/lib/format'
import { forecast, type DashboardData, type GuestRow, type Totals } from '@/components/partner-dashboard/calc'

export function ForecastTab({ data, totals }: { data: DashboardData; totals: Totals }) {
  const { fmt, today, rooms } = useApp()
  const f = useMemo(() => forecast(data, today, totals.accountTotal), [data, today, totals.accountTotal])
  const roomName = (g: GuestRow) => rooms.find((r) => r.id === g.room_id || r.number === g.room)?.name ?? `Room ${g.room}`
  const balance = (g: GuestRow) => Number(g.amount_thb_stay ?? 0) - Number(g.payment ?? 0)
  const year = today.slice(0, 4)

  const columns: Column<GuestRow>[] = [
    { key: 'check_in', header: 'Check-in', cell: (g) => formatDate(g.check_in), sortValue: (g) => g.check_in, width: '8rem' },
    { key: 'guest', header: 'Guest', cell: (g) => <span className="font-medium">{g.guest_name}</span>, sortValue: (g) => g.guest_name },
    { key: 'room', header: 'Room', cell: roomName, sortValue: (g) => g.room, hide: 'lg' },
    { key: 'nights', header: 'Nights', cell: (g) => nightsBetween(g.check_in, g.check_out), sortValue: (g) => nightsBetween(g.check_in, g.check_out), align: 'right', hide: 'lg' },
    { key: 'total', header: 'Total', cell: (g) => <span className="font-semibold">{fmt(g.amount_thb_stay)}</span>, sortValue: (g) => g.amount_thb_stay ?? 0, align: 'right' },
    { key: 'balance', header: 'Balance', cell: (g) => <span className={balance(g) > 0 ? 'text-danger' : 'text-success'}>{fmt(balance(g))}</span>, sortValue: balance, align: 'right', hide: 'md' },
  ]

  return (
    <div className="space-y-6">
      <StatGrid>
        <StatCard label="Projected cash" sub="accounts + future bookings − remaining budget expenses" value={fmt(f.projectedCash)} icon={Wallet} tone={f.projectedCash >= 0 ? 'success' : 'danger'} />
        <StatCard label="Future bookings" sub={`${f.upcoming.length} arriving after today`} value={fmt(f.futureRevenue)} icon={CalendarCheck} tone="primary" />
        <StatCard label="Budget revenue left" sub={`rest of ${year}`} value={fmt(f.remainingBudgetRevenue)} icon={Banknote} />
        <StatCard label="Budget expenses left" sub={`rest of ${year}`} value={fmt(f.remainingBudgetExpenses)} icon={Receipt} />
      </StatGrid>

      <section>
        <h2 className="mb-3 font-display text-lg font-semibold text-ink">Upcoming bookings</h2>
        <DataTable
          rows={f.upcoming}
          columns={columns}
          rowKey={(g) => g.id}
          defaultSort={{ key: 'check_in', dir: 'asc' }}
          empty={<div className="card p-4 text-sm text-muted">No bookings after today.</div>}
          footer={(list) => (
            <div className="flex flex-wrap justify-between gap-2 tabular">
              <span className="text-muted">{list.length} bookings</span>
              <span>
                Total <strong>{fmt(list.reduce((s, g) => s + Number(g.amount_thb_stay ?? 0), 0))}</strong> · Outstanding <strong className="text-danger">{fmt(list.reduce((s, g) => s + Math.max(0, balance(g)), 0))}</strong>
              </span>
            </div>
          )}
          renderCard={(g) => (
            <>
              <CardTitle title={g.guest_name} subtitle={roomName(g)} right={<span className="font-semibold tabular">{fmt(g.amount_thb_stay)}</span>} />
              <CardRow label="Stay">
                {formatDate(g.check_in)} → {formatDate(g.check_out)} · {nightsBetween(g.check_in, g.check_out)}n
              </CardRow>
              <CardRow label="Balance">
                <span className={balance(g) > 0 ? 'text-danger' : 'text-success'}>{fmt(balance(g))}</span>
              </CardRow>
            </>
          )}
        />
      </section>
    </div>
  )
}
