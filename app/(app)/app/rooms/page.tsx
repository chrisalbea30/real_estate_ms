import type { Metadata } from 'next'
import { pageContext } from '@/lib/page'
import { createServerSupabase } from '@/lib/supabase/server'
import { todayIn } from '@/lib/format'
import { RoomsClient } from '@/components/rooms/RoomsClient'
import type { Room, RoomPhoto, Guest } from '@/lib/types'

export const metadata: Metadata = { title: 'Rooms' }

export default async function RoomsPage() {
  const ctx = await pageContext('rooms')
  const supabase = await createServerSupabase()
  const today = todayIn(ctx.property.timezone)

  const [rooms, photos, guests] = await Promise.all([
    supabase.from('rooms').select('*').eq('property_id', ctx.property.id).order('number'),
    supabase.from('room_photos').select('*').eq('property_id', ctx.property.id).order('position'),
    supabase.from('guests').select('id, room, room_id, guest_name, check_in, check_out').eq('property_id', ctx.property.id).lte('check_in', today).gt('check_out', today),
  ])

  return (
    <RoomsClient
      rooms={(rooms.data ?? []) as Room[]}
      photos={(photos.data ?? []) as RoomPhoto[]}
      inHouse={(guests.data ?? []) as Pick<Guest, 'id' | 'room' | 'room_id' | 'guest_name' | 'check_in' | 'check_out'>[]}
    />
  )
}
