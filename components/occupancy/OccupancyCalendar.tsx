'use client'

import { useMemo } from 'react'
import { addDays, cn, daysInMonth, formatDate } from '@/lib/format'
import { assignLanes, firstName, type Stay } from '@/components/occupancy/stays'
import type { Room } from '@/lib/types'

const WD = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const weekday = (iso: string) => new Date(`${iso}T00:00:00Z`).getUTCDay()

/**
 * Month grid: one row per active room, one column per day. A cell is occupied
 * for the nights check_in <= day < check_out (string comparison, check-out
 * night excluded). Overlapping stays in one room are stacked in lanes.
 */
export function OccupancyCalendar({ rooms, stays, year, month, today, onSelect }: { rooms: Room[]; stays: Stay[]; year: number; month: number; today: string; onSelect: (s: Stay) => void }) {
  const dim = daysInMonth(year, month)
  const ym = `${year}-${String(month).padStart(2, '0')}`
  const days = useMemo(() => Array.from({ length: dim }, (_, i) => `${ym}-${String(i + 1).padStart(2, '0')}`), [ym, dim])
  const firstDay = days[0]!

  const lanesByRoom = useMemo(() => {
    const map = new Map<string, Stay[][]>()
    for (const r of rooms) map.set(r.id, assignLanes(stays.filter((s) => s.room?.id === r.id)))
    return map
  }, [rooms, stays])

  return (
    <div className="card overflow-hidden">
      <div className="max-h-[75dvh] overflow-auto">
        <table className="w-full border-separate border-spacing-0 text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-40 w-28 min-w-28 border-b border-r border-line bg-surface-2 px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted">Room</th>
              {days.map((d) => {
                const wd = weekday(d)
                const weekend = wd === 0 || wd === 6
                const isToday = d === today
                return (
                  <th key={d} scope="col" className={cn('sticky top-0 z-30 min-w-9 border-b border-line px-0 py-1.5 text-center font-medium', weekend ? 'bg-surface-3' : 'bg-surface-2', isToday && 'text-primary')} aria-label={formatDate(d)}>
                    <div className="text-[10px] uppercase text-muted">{WD[wd]}</div>
                    <div className={cn('mx-auto flex h-6 w-6 items-center justify-center rounded-full tabular', isToday && 'bg-primary font-semibold text-primary-fg')}>{Number(d.slice(8, 10))}</div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {rooms.length === 0 && (
              <tr>
                <td colSpan={dim + 1} className="p-6 text-center text-sm text-muted">
                  No active rooms for this property. Add rooms in Settings.
                </td>
              </tr>
            )}
            {rooms.map((r) => {
              const lanes = lanesByRoom.get(r.id) ?? []
              const laneH = lanes.length <= 1 ? 'h-6' : lanes.length === 2 ? 'h-4' : 'h-2.5'
              const showText = lanes.length <= 2
              return (
                <tr key={r.id}>
                  <th scope="row" className="sticky left-0 z-20 border-b border-r border-line bg-surface px-3 py-2 text-left align-middle">
                    <div className="truncate text-sm font-semibold text-ink">{r.name}</div>
                    <div className="text-[10px] font-normal text-muted">Room {r.number}</div>
                  </th>
                  {days.map((d) => {
                    const wd = weekday(d)
                    const weekend = wd === 0 || wd === 6
                    const isToday = d === today
                    return (
                      <td key={d} className={cn('h-11 border-b border-l border-line/70 p-0 align-middle', weekend && 'bg-surface-2/60', isToday && 'bg-primary-soft/40')}>
                        {lanes.length > 0 && (
                          <div className="flex flex-col justify-center gap-px py-0.5">
                            {lanes.map((lane, li) => {
                              const s = lane.find((x) => x.guest.check_in <= d && x.guest.check_out > d)
                              if (!s) return <div key={li} className={laneH} aria-hidden />
                              const g = s.guest
                              const isStart = g.check_in === d
                              const isEnd = addDays(d, 1) === g.check_out
                              const labelDay = g.check_in > firstDay ? g.check_in : firstDay
                              const showLabel = showText && d === labelDay
                              return (
                                <button
                                  key={li}
                                  type="button"
                                  onClick={() => onSelect(s)}
                                  title={`${g.guest_name} · ${formatDate(g.check_in)} → ${formatDate(g.check_out)}`}
                                  aria-label={`${g.guest_name}, ${r.name}, ${formatDate(g.check_in)} to ${formatDate(g.check_out)}`}
                                  className={cn(
                                    'relative block text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring hover:brightness-110',
                                    laneH,
                                    s.color.cls,
                                    isStart ? 'ml-0.5 rounded-l-full' : '-ml-px',
                                    isEnd ? 'mr-0.5 rounded-r-full' : '-mr-px',
                                    showLabel && 'z-10',
                                  )}
                                >
                                  {showLabel && (
                                    <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 truncate text-[11px] font-semibold leading-none" style={{ maxWidth: `calc(${Math.max(1, s.nights) * 100}% - 1rem)` }}>
                                      {firstName(g.guest_name)}
                                    </span>
                                  )}
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
