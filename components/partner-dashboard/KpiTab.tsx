'use client'

import { useMemo, useState } from 'react'
import { BedDouble, Banknote, TrendingUp, Moon } from 'lucide-react'
import { StatCard, StatGrid } from '@/components/ui/StatCard'
import { DataTable, CardRow, CardTitle, type Column } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { useApp } from '@/components/app/AppProvider'
import { formatMonth, formatNumber, formatPct, monthStart } from '@/lib/format'
import { kpisFor, trailingMonths, type GuestRow, type MonthKpi } from '@/components/partner-dashboard/calc'

const occupancyTone = (pct: number): 'success' | 'warning' | 'danger' => (pct >= 70 ? 'success' : pct >= 40 ? 'warning' : 'danger')

export function KpiTab({ guests, totalRooms }: { guests: GuestRow[]; totalRooms: number }) {
  const { fmt, today } = useApp()
  const [ym, setYm] = useState(today.slice(0, 7))
  const year = Number(ym.slice(0, 4)) || Number(today.slice(0, 4))
  const month = Number(ym.slice(5, 7)) || Number(today.slice(5, 7))

  const kpi = useMemo(() => kpisFor(guests, year, month, totalRooms), [guests, year, month, totalRooms])
  const history = useMemo(() => trailingMonths(year, month, 12).map((m) => kpisFor(guests, m.year, m.month, totalRooms)).reverse(), [guests, year, month, totalRooms])

  const columns: Column<MonthKpi>[] = [
    { key: 'month', header: 'Month', cell: (r) => <span className="font-medium">{formatMonth(monthStart(r.year, r.month))}</span>, sortValue: (r) => r.year * 100 + r.month },
    { key: 'occupancy', header: 'Occupancy', cell: (r) => <Badge tone={occupancyTone(r.occupancy)}>{formatPct(r.occupancy, 0)}</Badge>, sortValue: (r) => r.occupancy, align: 'right' },
    { key: 'adr', header: 'ADR', cell: (r) => fmt(r.adr), sortValue: (r) => r.adr, align: 'right' },
    { key: 'revpar', header: 'RevPAR', cell: (r) => fmt(r.revpar), sortValue: (r) => r.revpar, align: 'right', hide: 'lg' },
    { key: 'nights', header: 'Nights', cell: (r) => formatNumber(r.occupiedNights), sortValue: (r) => r.occupiedNights, align: 'right', hide: 'lg' },
    { key: 'bookings', header: 'Bookings', cell: (r) => formatNumber(r.bookings), sortValue: (r) => r.bookings, align: 'right', hide: 'xl' },
    { key: 'revenue', header: 'Revenue', cell: (r) => <span className="font-semibold">{fmt(r.monthRevenue)}</span>, sortValue: (r) => r.monthRevenue, align: 'right' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">
          Stay totals pro-rated to the nights inside the month · {totalRooms > 0 ? `${totalRooms} active room${totalRooms === 1 ? '' : 's'}` : 'no active rooms (using 1)'} · {kpi.days} days
        </p>
        <input type="month" className="input sm:w-auto" value={ym} onChange={(e) => e.target.value && setYm(e.target.value)} aria-label="Month" />
      </div>

      <StatGrid>
        <StatCard label="Occupancy" sub={`${formatNumber(kpi.occupiedNights)} of ${formatNumber(Math.max(1, totalRooms) * kpi.days)} room-nights`} value={formatPct(kpi.occupancy, 0)} icon={BedDouble} tone={occupancyTone(kpi.occupancy)} />
        <StatCard label="ADR" sub="revenue per occupied night" value={fmt(kpi.adr)} icon={Banknote} tone="primary" />
        <StatCard label="RevPAR" sub="revenue per available room" value={fmt(kpi.revpar)} icon={TrendingUp} tone="info" />
        <StatCard label="Avg stay" sub={`${formatNumber(kpi.bookings)} booking${kpi.bookings === 1 ? '' : 's'} overlapping`} value={`${formatNumber(kpi.avgStay, 1)} n`} icon={Moon} />
      </StatGrid>

      <section>
        <h2 className="mb-3 font-display text-lg font-semibold text-ink">Last 12 months</h2>
        <DataTable
          rows={history}
          columns={columns}
          rowKey={(r) => `${r.year}-${r.month}`}
          pageSize={0}
          renderCard={(r) => (
            <>
              <CardTitle title={formatMonth(monthStart(r.year, r.month))} right={<Badge tone={occupancyTone(r.occupancy)}>{formatPct(r.occupancy, 0)}</Badge>} />
              <CardRow label="ADR">{fmt(r.adr)}</CardRow>
              <CardRow label="RevPAR">{fmt(r.revpar)}</CardRow>
              <CardRow label="Nights">{formatNumber(r.occupiedNights)} · {formatNumber(r.bookings)} bookings</CardRow>
              <CardRow label="Revenue">{fmt(r.monthRevenue)}</CardRow>
            </>
          )}
        />
      </section>
    </div>
  )
}
