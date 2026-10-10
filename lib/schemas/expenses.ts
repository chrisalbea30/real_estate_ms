import { z } from 'zod'
import { ymd, money, optText, num } from '@/lib/schemas/guests'
import { AUDIT_STATUSES, LEGAL_STATUSES } from '@/lib/types'

export const expenseSchema = z
  .object({
    id: z.string().uuid().optional(),
    payment_date: ymd,
    transaction_number: optText(40),
    document_number: optText(40),
    category: optText(80),
    subcategory: optText(80),
    supplier: optText(200),
    amount: money,
    currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, 'Choose a currency'),
    payment_method_id: z.union([z.string().uuid(), z.literal(''), z.null()]).optional(),
    /** Free-text label kept for legacy rows without a payment_method_id. */
    method: optText(80),
    paid_by: optText(120),
    audit: z.enum(AUDIT_STATUSES).default('To check'),
    type: optText(80),
    description: optText(4000),
    is_legal: z.boolean().default(false),
    file_url: optText(500),
  })
  .refine((e) => num(e.amount) != null, { message: 'Enter an amount', path: ['amount'] })

export type ExpenseInput = z.input<typeof expenseSchema>

/** Legal / accounting review of a shared expense (only these three columns change). */
export const legalReviewSchema = z.object({
  id: z.string().uuid(),
  legal_status: z.enum(LEGAL_STATUSES),
  legal_notes: optText(4000),
  legal_reviewed_at: ymd,
})

export type LegalReviewInput = z.input<typeof legalReviewSchema>
