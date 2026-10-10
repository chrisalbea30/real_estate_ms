import { z } from 'zod'
import { ymd, money, optText, num } from '@/lib/schemas/guests'

/** Manual revenue rows only. Booking rows are written by the guests trigger. */
export const revenueSchema = z
  .object({
    id: z.string().uuid().optional(),
    date: ymd,
    type: z.string().trim().min(1, 'Choose a source').max(80),
    supplier: optText(200),
    amount_thb: money,
    notes: optText(4000),
    file_url: optText(500),
    show_on_legal: z.boolean().default(false),
  })
  .refine((r) => num(r.amount_thb) != null, { message: 'Enter an amount', path: ['amount_thb'] })

export type RevenueInput = z.input<typeof revenueSchema>
