'use server'

import { revalidatePath } from 'next/cache'
import { requirePerm } from '@/lib/context'
import { createServerSupabase } from '@/lib/supabase/server'
import { run, must, mustOk, type ActionResult } from '@/lib/actions'
import { roomSchema, inventorySchema, extinguisherSchema, type RoomInput, type InventoryInput, type ExtinguisherInput } from '@/lib/schemas/rooms'
import { BUCKET } from '@/lib/storage'
import type { Room, RoomInventory, FireExtinguisher, RoomPhoto } from '@/lib/types'

function refresh(roomId?: string) {
  revalidatePath('/app', 'layout')
  revalidatePath('/app/rooms')
  if (roomId) revalidatePath(`/app/rooms/${roomId}`)
}

export async function saveRoomAction(input: RoomInput): Promise<ActionResult<Room>> {
  return run(async () => {
    const data = roomSchema.parse(input)
    const ctx = await requirePerm('rooms', data.id ? 'edit' : 'add')
    const supabase = await createServerSupabase()
    const payload = { number: data.number, name: data.name, active: data.active }
    const row = data.id
      ? must(await supabase.from('rooms').update(payload).eq('id', data.id).eq('organization_id', ctx.org.id).select().single(), 'Update room')
      : must(await supabase.from('rooms').insert({ ...payload, organization_id: ctx.org.id, property_id: ctx.property.id }).select().single(), 'Create room')
    refresh(row.id)
    return row as Room
  })
}

export async function deleteRoomAction(id: string): Promise<ActionResult<undefined>> {
  return run(async () => {
    const ctx = await requirePerm('rooms', 'delete')
    const supabase = await createServerSupabase()
    mustOk(await supabase.from('rooms').delete().eq('id', id).eq('organization_id', ctx.org.id))
    refresh()
    return undefined
  })
}

export async function addRoomPhotoAction(roomId: string, path: string): Promise<ActionResult<RoomPhoto>> {
  return run(async () => {
    const ctx = await requirePerm('rooms', 'edit')
    const supabase = await createServerSupabase()
    const { count } = await supabase.from('room_photos').select('id', { count: 'exact', head: true }).eq('room_id', roomId)
    if ((count ?? 0) >= 5) throw new Error('A room can have at most 5 photos')
    const row = must(
      await supabase.from('room_photos').insert({ organization_id: ctx.org.id, property_id: ctx.property.id, room_id: roomId, url: path, position: count ?? 0 }).select().single(),
      'Add photo',
    )
    refresh(roomId)
    return row as RoomPhoto
  })
}

export async function deleteRoomPhotoAction(photoId: string): Promise<ActionResult<undefined>> {
  return run(async () => {
    const ctx = await requirePerm('rooms', 'edit')
    const supabase = await createServerSupabase()
    const photo = must(await supabase.from('room_photos').select('id, room_id, url').eq('id', photoId).eq('organization_id', ctx.org.id).single(), 'Photo')
    mustOk(await supabase.from('room_photos').delete().eq('id', photoId))
    if (photo.url && !/^https?:\/\//.test(photo.url)) {
      await supabase.storage.from(BUCKET).remove([photo.url])
    }
    refresh(photo.room_id)
    return undefined
  })
}

export async function saveInventoryAction(input: InventoryInput): Promise<ActionResult<RoomInventory>> {
  return run(async () => {
    const data = inventorySchema.parse(input)
    const ctx = await requirePerm('rooms', data.id ? 'edit' : 'add')
    const supabase = await createServerSupabase()
    const payload = { room_id: data.room_id, name: data.name, category: data.category, quantity: data.quantity, notes: data.notes || null }
    const row = data.id
      ? must(await supabase.from('room_inventory').update(payload).eq('id', data.id).eq('organization_id', ctx.org.id).select().single(), 'Update item')
      : must(await supabase.from('room_inventory').insert({ ...payload, organization_id: ctx.org.id, property_id: ctx.property.id }).select().single(), 'Add item')
    refresh(data.room_id)
    return row as RoomInventory
  })
}

export async function deleteInventoryAction(id: string, roomId: string): Promise<ActionResult<undefined>> {
  return run(async () => {
    const ctx = await requirePerm('rooms', 'delete')
    const supabase = await createServerSupabase()
    mustOk(await supabase.from('room_inventory').delete().eq('id', id).eq('organization_id', ctx.org.id))
    refresh(roomId)
    return undefined
  })
}

export async function saveExtinguisherAction(input: ExtinguisherInput): Promise<ActionResult<FireExtinguisher>> {
  return run(async () => {
    const data = extinguisherSchema.parse(input)
    const ctx = await requirePerm('rooms', data.id ? 'edit' : 'add')
    const supabase = await createServerSupabase()
    const payload = {
      room_id: data.room_id,
      location: data.location,
      serial_number: data.serial_number || null,
      expiry_date: data.expiry_date,
      last_inspected: data.last_inspected || null,
      notes: data.notes || null,
    }
    const row = data.id
      ? must(await supabase.from('room_fire_extinguishers').update(payload).eq('id', data.id).eq('organization_id', ctx.org.id).select().single(), 'Update extinguisher')
      : must(await supabase.from('room_fire_extinguishers').insert({ ...payload, organization_id: ctx.org.id, property_id: ctx.property.id }).select().single(), 'Add extinguisher')
    refresh(data.room_id)
    return row as FireExtinguisher
  })
}

export async function deleteExtinguisherAction(id: string, roomId: string): Promise<ActionResult<undefined>> {
  return run(async () => {
    const ctx = await requirePerm('rooms', 'delete')
    const supabase = await createServerSupabase()
    mustOk(await supabase.from('room_fire_extinguishers').delete().eq('id', id).eq('organization_id', ctx.org.id))
    refresh(roomId)
    return undefined
  })
}
