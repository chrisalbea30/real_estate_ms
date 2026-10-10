import { z } from 'zod'

export const roomSchema = z.object({
  id: z.string().uuid().optional(),
  number: z.coerce.number().int().min(0, 'Room number must be 0 or more').max(99999),
  name: z.string().trim().min(1, 'Name is required').max(80),
  active: z.boolean().default(true),
})
export type RoomInput = z.input<typeof roomSchema>

export const inventorySchema = z.object({
  id: z.string().uuid().optional(),
  room_id: z.string().uuid(),
  name: z.string().trim().min(1, 'Item name is required').max(120),
  category: z.string().trim().min(1).max(60).default('General'),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1').max(100000),
  notes: z.string().trim().max(2000).optional().nullable(),
})
export type InventoryInput = z.input<typeof inventorySchema>

export const extinguisherSchema = z.object({
  id: z.string().uuid().optional(),
  room_id: z.string().uuid(),
  location: z.string().trim().min(1).max(80).default('Room'),
  serial_number: z.string().trim().max(80).optional().nullable(),
  expiry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expiry date is required'),
  last_inspected: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable().or(z.literal('')),
  notes: z.string().trim().max(2000).optional().nullable(),
})
export type ExtinguisherInput = z.input<typeof extinguisherSchema>
