import type { Metadata } from 'next'
import { pageContext } from '@/lib/page'
import { createServerSupabase } from '@/lib/supabase/server'
import { monthEnd, monthStart, todayIn } from '@/lib/format'
import { OccupancyClient, type OccupancyGuest } from '@/components/occupancy/OccupancyClient'
import type { Room } from '@/lib/types'

export const metadata: Metadata = { title: 'Occupancy' }

export default async function OccupancyPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { m } = await searchParams
  const ctx = await pageContext('occupancy')
  const supabase = await createServerSupabase()
  const today = todayIn(ctx.property.timezone)

  // ?m=YYYY-MM, defaulting to the current month in the property's timezone.
  const ym = m && /^\d{4}-(0[1-9]|1[0-2])$/.test(m) ? m : today.slice(0, 7)
  const year = Number(ym.slice(0, 4))
  const month = Number(ym.slice(5, 7))
  const start = monthStart(year, month)
  const end = monthEnd(year, month)

  const [rooms, guests] = await Promise.all([
    supabase.from('rooms').select('*').eq('property_id', ctx.property.id).eq('active', true).order('number'),
    supabase
      .from('guests')
      .select('id, room, room_id, guest_name, guest_count, check_in, check_out, amount_thb_stay, payment, booking_source, tm30')
      .eq('property_id', ctx.property.id)
      .lte('check_in', end)
      .gte('check_out', start)
      .order('check_in'),
  ])

  return <OccupancyClient year={year} month={month} rooms={(rooms.data ?? []) as Room[]} guests={(guests.data ?? []) as OccupancyGuest[]} />
}
