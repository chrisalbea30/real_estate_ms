// Pure helpers for the occupancy calendar: per-guest colours, the stay model
// and lane assignment for overlapping bookings. No React, no 'use client'.

import { nightsBetween, nightsInMonth, monthEnd, monthStart } from '@/lib/format'
import type { Guest, Room } from '@/lib/types'

export type OccupancyGuest = Pick<Guest, 'id' | 'room' | 'room_id' | 'guest_name' | 'guest_count' | 'check_in' | 'check_out' | 'amount_thb_stay' | 'payment' | 'booking_source' | 'tm30'>

export type GuestColor = { cls: string; swatch: string }

/**
 * Ten identity colours that sit well with the burgundy/gold theme. Each pair
 * is a bar background plus a readable text colour. Colour is never the only
 * cue: every bar carries the guest's name and the legend repeats it. Classes
 * are written out in full so Tailwind can find them.
 */
export const GUEST_PALETTE: GuestColor[] = [
  { cls: 'bg-[#B8123F] text-white', swatch: '#B8123F' }, // wine
  { cls: 'bg-[#C9A227] text-[#1D0C10]', swatch: '#C9A227' }, // gold
  { cls: 'bg-[#6D4BC4] text-white', swatch: '#6D4BC4' }, // violet
  { cls: 'bg-[#0E8A8A] text-white', swatch: '#0E8A8A' }, // teal
  { cls: 'bg-[#2E8B4F] text-white', swatch: '#2E8B4F' }, // green
  { cls: 'bg-[#C9541F] text-white', swatch: '#C9541F' }, // rust
  { cls: 'bg-[#3B6FD6] text-white', swatch: '#3B6FD6' }, // blue
  { cls: 'bg-[#D8578F] text-[#1D0C10]', swatch: '#D8578F' }, // rose
  { cls: 'bg-[#800020] text-[#EBD68F]', swatch: '#800020' }, // deep burgundy
  { cls: 'bg-[#7A5C12] text-white', swatch: '#7A5C12' }, // bronze
]

/** Stable colour per guest name (djb2 hash, case-insensitive). */
export function guestColor(name: string): GuestColor {
  let h = 5381
  for (const ch of (name ?? '').trim().toLowerCase()) h = ((h << 5) + h + ch.charCodeAt(0)) | 0
  return GUEST_PALETTE[Math.abs(h) % GUEST_PALETTE.length]!
}

export function firstName(name: string) {
  return (name ?? '').trim().split(/\s+/)[0] || name
}

export type Stay = {
  guest: OccupancyGuest
  /** Resolved active room (by room_id first, then by room number); null when the room is inactive or unknown. */
  room: Room | null
  /** Nights of the whole stay (check-out night excluded). */
  totalNights: number
  /** Nights that fall inside the displayed month. */
  nights: number
  /** True when the stay occupies at least one night of the month or starts inside it (day use). */
  inMonth: boolean
  /** Stay revenue pro-rated to the month: amount × nights / totalNights. */
  prorated: number
  color: GuestColor
}

export function buildStays(guests: OccupancyGuest[], rooms: Room[], year: number, month: number): Stay[] {
  const start = monthStart(year, month)
  const end = monthEnd(year, month)
  return guests.map((g) => {
    const room = rooms.find((r) => r.id === g.room_id) ?? rooms.find((r) => r.number === g.room) ?? null
    const totalNights = nightsBetween(g.check_in, g.check_out)
    const nights = nightsInMonth(g.check_in, g.check_out, year, month)
    const startsInMonth = g.check_in >= start && g.check_in <= end
    const amount = Number(g.amount_thb_stay ?? 0)
    const prorated = totalNights > 0 ? (amount * nights) / totalNights : startsInMonth ? amount : 0
    return { guest: g, room, totalNights, nights, inMonth: nights > 0 || startsInMonth, prorated, color: guestColor(g.guest_name) }
  })
}

/**
 * Greedy lane assignment: stays sorted by check-in, each placed in the first
 * lane whose last stay ends on or before this check-in. Overlapping bookings
 * in one room therefore land in separate lanes and are drawn stacked.
 */
export function assignLanes(stays: Stay[]): Stay[][] {
  const sorted = [...stays].sort((a, b) => a.guest.check_in.localeCompare(b.guest.check_in) || a.guest.check_out.localeCompare(b.guest.check_out))
  const lanes: Stay[][] = []
  for (const s of sorted) {
    const lane = lanes.find((l) => l[l.length - 1]!.guest.check_out <= s.guest.check_in)
    if (lane) lane.push(s)
    else lanes.push([s])
  }
  return lanes
}
