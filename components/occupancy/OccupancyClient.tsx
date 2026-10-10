'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, Banknote, BedDouble, BookOpen, ChevronLeft, ChevronRight, Moon, Percent, TrendingUp } from 'lucide-react'
import { PageHeader, Section } from '@/components/ui/PageHeader'
import { StatCard } from '@/components/ui/StatCard'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { useApp } from '@/components/app/AppProvider'
import { cn, daysInMonth, formatDate, formatMonth, formatNumber, formatPct } from '@/lib/format'
import { OccupancyCalendar } from '@/components/occupancy/OccupancyCalendar'
import { buildStays, type OccupancyGuest, type Stay } from '@/components/occupancy/stays'
import type { Room } from '@/lib/types'

export type { OccupancyGuest } from '@/components/occupancy/stays'

const ymOf = (y: number, m: number) => `${y}-${String(m).padStart(2, '0')}`

export function OccupancyClient({ year, month, rooms, guests }: { year: number; month: number; rooms: Room[]; guests: OccupancyGuest[] }) {
  const router = useRouter()
  const { fmt, today, can } = useApp()
  const [selected, setSelected] = useState<Stay | null>(null)

  const ym = ymOf(year, month)
  const dim = daysInMonth(year, month)
  const todayYm = today.slice(0, 7)

  const go = (y: number, m: number) => {
    if (m < 1) {
      y -= 1
      m = 12
    } else if (m > 12) {
      y += 1
      m = 1
    }
    router.push(`/app/occupancy?m=${ymOf(y, m)}`)
  }

  const stays = useMemo(() => buildStays(guests, rooms, year, month), [guests, rooms, year, month])

  // TOTAL_ROOMS = active rooms of the property; nights are counted per month
  // with nightsInMonth (check-out night excluded, last night of the month kept).
  const stats = useMemo(() => {
    const available = rooms.length * dim
    const counted = stays.filter((s) => s.inMonth)
    const sold = counted.reduce((s, x) => s + x.nights, 0)
    const revenue = counted.reduce((s, x) => s + x.prorated, 0)
    return {
      available,
      sold,
      bookings: counted.length,
      occupancy: available > 0 ? (sold / available) * 100 : 0,
      revenue,
      adr: sold > 0 ? revenue / sold : 0,
      revpar: available > 0 ? revenue / available : 0,
      unplaced: counted.filter((s) => !s.room).length,
    }
  }, [stays, rooms.length, dim])

  const legend = useMemo(() => {
    const seen = new Map<string, Stay>()
    for (const s of [...stays].sort((a, b) => a.guest.check_in.localeCompare(b.guest.check_in))) {
      if (s.inMonth && !seen.has(s.guest.guest_name)) seen.set(s.guest.guest_name, s)
    }
    return [...seen.values()]
  }, [stays])

  const sel = selected?.guest
  const selBalance = sel ? Number(sel.amount_thb_stay ?? 0) - Number(sel.payment ?? 0) : 0

  return (
    <div>
      <PageHeader
        title="Occupancy"
        subtitle={`${formatMonth(ym)} · ${rooms.length} active room${rooms.length === 1 ? '' : 's'}`}
        actions={
          <div className="flex flex-wrap items-center gap-1.5">
            <button type="button" className="icon-btn" onClick={() => go(year, month - 1)} aria-label="Previous month">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <input
              type="month"
              className="input !w-auto"
              value={ym}
              aria-label="Month"
              onChange={(e) => {
                const v = e.target.value
                if (/^\d{4}-(0[1-9]|1[0-2])$/.test(v)) router.push(`/app/occupancy?m=${v}`)
              }}
            />
            <button type="button" className="icon-btn" onClick={() => go(year, month + 1)} aria-label="Next month">
              <ChevronRight className="h-5 w-5" />
            </button>
            {ym !== todayYm && (
              <button type="button" className="btn-ghost btn-sm" onClick={() => router.push(`/app/occupancy?m=${todayYm}`)}>
                This month
              </button>
            )}
          </div>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Occupancy" value={formatPct(stats.occupancy, 1)} icon={Percent} tone={stats.occupancy >= 70 ? 'success' : stats.occupancy >= 40 ? 'warning' : 'default'} sub={`${formatNumber(stats.sold)} of ${formatNumber(stats.available)} room nights`} />
        <StatCard label="Nights sold" value={formatNumber(stats.sold)} icon={Moon} tone="primary" sub={`${rooms.length} rooms × ${dim} nights`} />
        <StatCard label="Bookings" value={stats.bookings} icon={BedDouble} tone="info" sub="Stays touching this month" />
        <StatCard label="Room revenue" value={fmt(stats.revenue)} icon={Banknote} tone="accent" sub="Stay totals pro-rated to the month" />
        <StatCard label="ADR" value={fmt(stats.adr)} icon={TrendingUp} tone="default" sub="Revenue ÷ nights sold" />
        <StatCard label="RevPAR" value={fmt(stats.revpar)} icon={BookOpen} tone="default" sub="Revenue ÷ nights available" />
      </div>

      <Section title="Calendar" description="Tap a bar for the booking. Check-out nights are not counted.">
        <OccupancyCalendar rooms={rooms} stays={stays} year={year} month={month} today={today} onSelect={setSelected} />
        {stats.unplaced > 0 && (
          <p className="mt-2 text-xs text-muted">
            {stats.unplaced} booking{stats.unplaced === 1 ? '' : 's'} in inactive or unknown rooms {stats.unplaced === 1 ? 'is' : 'are'} counted in the figures but not drawn.
          </p>
        )}
      </Section>

      {legend.length > 0 && (
        <Section title="Guests this month" description={`${legend.length} name${legend.length === 1 ? '' : 's'}`}>
          <div className="flex flex-wrap gap-1.5">
            {legend.map((s) => (
              <button key={s.guest.guest_name} type="button" onClick={() => setSelected(s)} className="badge border border-line bg-surface text-ink-2 transition hover:bg-surface-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color.swatch }} aria-hidden />
                {s.guest.guest_name}
              </button>
            ))}
          </div>
        </Section>
      )}

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={sel?.guest_name ?? ''}
        subtitle={selected ? `${selected.room?.name ?? `Room ${sel?.room}`} · ${selected.totalNights} night${selected.totalNights === 1 ? '' : 's'}` : undefined}
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setSelected(null)}>
              Close
            </button>
            {can('guests') && (
              <Link href="/app/guests" className="btn-primary">
                Open guests <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        }
      >
        {selected && sel && (
          <dl className="space-y-2 text-sm">
            <Row label="Check-in">{formatDate(sel.check_in)}</Row>
            <Row label="Check-out">{formatDate(sel.check_out)}</Row>
            <Row label={`Nights in ${formatMonth(ym)}`}>
              {selected.nights} of {selected.totalNights}
            </Row>
            <Row label="Stay total">{fmt(sel.amount_thb_stay)}</Row>
            <Row label="Paid">{fmt(sel.payment)}</Row>
            <Row label="Balance">
              <span className={cn('font-semibold', selBalance > 0 ? 'text-danger' : 'text-success')}>{fmt(selBalance)}</span>
            </Row>
            <Row label="Source">{sel.booking_source ?? 'Direct'}</Row>
            {sel.guest_count ? <Row label="Guests">{sel.guest_count}</Row> : null}
            <Row label="TM30">
              <Badge tone={sel.tm30 ? 'success' : 'warning'}>{sel.tm30 ? 'Filed' : 'Pending'}</Badge>
            </Row>
          </dl>
        )}
      </Modal>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-medium text-ink tabular">{children}</dd>
    </div>
  )
}
