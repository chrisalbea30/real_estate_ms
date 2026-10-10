import { z } from 'zod'

export const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a date')
export const ymdOptional = z.union([ymd, z.literal(''), z.null()]).optional()
export const money = z.union([z.coerce.number(), z.literal(''), z.null()]).optional()
export const optText = (max = 500) => z.union([z.string().trim().max(max), z.null()]).optional()

export const guestSchema = z
  .object({
    id: z.string().uuid().optional(),
    room_id: z.string().uuid('Choose a room'),
    guest_name: z.string().trim().min(1, 'Guest name is required').max(120),
    guest_count: z.union([z.coerce.number().int().min(1).max(50), z.literal(''), z.null()]).optional(),
    check_in: ymd,
    check_out: ymd,
    booking_source: optText(60),
    amount_thb_day: money,
    amount_thb_stay: money,
    payment_method_id: z.union([z.string().uuid(), z.literal(''), z.null()]).optional(),
    payment: money,
    payment_1_date: ymdOptional,
    payment_1_amount: money,
    payment_2_date: ymdOptional,
    payment_2_amount: money,
    payment_3_date: ymdOptional,
    payment_3_amount: money,
    email: z.union([z.email('Enter a valid email'), z.literal(''), z.null()]).optional(),
    phone: optText(40),
    notes: optText(4000),
    passport_number: optText(40),
    passport_expiry: ymdOptional,
    tm30: z.boolean().default(false),
    add_to_revenue: z.boolean().default(false),
    show_on_legal: z.boolean().default(false),
    file_url: optText(500),
  })
  .refine((g) => g.check_out >= g.check_in, { message: 'Check-out must be on or after check-in', path: ['check_out'] })

export type GuestInput = z.input<typeof guestSchema>

export const num = (v: unknown): number | null => {
  if (v === '' || v === null || v === undefined) return null
  const n = Number(v)
  return isFinite(n) ? n : null
}
