import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { pageContext } from '@/lib/page'
import { createServerSupabase } from '@/lib/supabase/server'
import { todayIn } from '@/lib/format'
import { RoomDetailClient } from '@/components/rooms/RoomDetailClient'
import type { Room, RoomPhoto, RoomInventory, FireExtinguisher, Guest } from '@/lib/types'

export const metadata: Metadata = { title: 'Room' }

export default async function RoomDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await pageContext('rooms')
  const supabase = await createServerSupabase()
  const today = todayIn(ctx.property.timezone)

  const { data: room } = await supabase.from('rooms').select('*').eq('id', id).eq('organization_id', ctx.org.id).maybeSingle()
  if (!room) notFound()

  const [photos, inventory, extinguishers, guests] = await Promise.all([
    supabase.from('room_photos').select('*').eq('room_id', id).order('position'),
    supabase.from('room_inventory').select('*').eq('room_id', id).order('category').order('name'),
    supabase.from('room_fire_extinguishers').select('*').eq('room_id', id).order('expiry_date'),
    supabase
      .from('guests')
      .select('id, guest_name, check_in, check_out, amount_thb_stay, payment, room, room_id')
      .eq('property_id', ctx.property.id)
      .or(`room_id.eq.${id},room.eq.${(room as Room).number}`)
      .gte('check_out', today)
      .order('check_in')
      .limit(12),
  ])

  return (
    <RoomDetailClient
      room={room as Room}
      photos={(photos.data ?? []) as RoomPhoto[]}
      inventory={(inventory.data ?? []) as RoomInventory[]}
      extinguishers={(extinguishers.data ?? []) as FireExtinguisher[]}
      guests={(guests.data ?? []) as Pick<Guest, 'id' | 'guest_name' | 'check_in' | 'check_out' | 'amount_thb_stay' | 'payment' | 'room' | 'room_id'>[]}
      today={today}
    />
  )
}
