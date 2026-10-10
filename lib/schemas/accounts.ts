import { z } from 'zod'
import { ymd, money, optText, num } from '@/lib/schemas/guests'

export const ACCOUNT_TYPES = ['bank', 'cash', 'wallet', 'other'] as const
export type AccountType = (typeof ACCOUNT_TYPES)[number]

export const accountSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, 'Name is required').max(80),
  type: z.enum(ACCOUNT_TYPES).default('bank'),
  currency: z.union([z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, 'Use a 3-letter code'), z.literal(''), z.null()]).optional(),
  opening_balance: money,
  notes: optText(2000),
  active: z.boolean().default(true),
})

export type AccountInput = z.input<typeof accountSchema>

/** Manual ledger movement (source_table = 'adjustment'). */
export const adjustmentSchema = z
  .object({
    account_id: z.string().uuid('Choose an account'),
    amount: money,
    occurred_on: ymd,
    description: optText(500),
  })
  .refine(
    (a) => {
      const n = num(a.amount)
      return n != null && n !== 0
    },
    { message: 'Enter a non-zero amount', path: ['amount'] },
  )

export type AdjustmentInput = z.input<typeof adjustmentSchema>
