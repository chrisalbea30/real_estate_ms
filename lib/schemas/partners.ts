import { z } from 'zod'
import { ymd, ymdOptional, money, optText } from '@/lib/schemas/guests'

// Partners group: partner profiles (table `shareholders`), capital contributions
// (`founding_contributions`), partner work (`shareholder_work`) and meetings
// (`shareholder_meetings`). Strings arrive from inputs; numbers are coerced.

const nonNegMoney = z.union([z.coerce.number().min(0, 'Must be 0 or more'), z.literal(''), z.null()]).optional()
const pct = z.union([z.coerce.number().min(0, 'Must be between 0 and 100').max(100, 'Must be between 0 and 100'), z.literal(''), z.null()]).optional()
const uuidOptional = z.union([z.string().uuid(), z.literal(''), z.null()]).optional()

export const partnerSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, 'Name is required').max(120),
  role: z.string().trim().min(1, 'Role is required').max(80),
  share_percentage: pct,
  amount_to_found_thb: nonNegMoney,
  hour_rate: nonNegMoney,
  bio: optText(4000),
  photo_url: optText(500),
  email: z.union([z.email('Enter a valid email'), z.literal(''), z.null()]).optional(),
  phone: optText(40),
  nationality: optText(60),
  joined_date: ymdOptional,
  user_id: uuidOptional,
  active: z.boolean().default(true),
})
export type PartnerInput = z.input<typeof partnerSchema>

/** Inline edit of the ownership percentage from the partner dashboard. */
export const sharePercentageSchema = z.object({
  id: z.string().uuid(),
  share_percentage: pct,
})
export type SharePercentageInput = z.input<typeof sharePercentageSchema>

export const contributionSchema = z.object({
  id: z.string().uuid().optional(),
  date: ymd,
  shareholder_id: z.string().uuid('Choose a partner'),
  method: optText(60),
  amount_thb: z.coerce.number().min(0, 'Amount must be 0 or more'),
  amount_eur: nonNegMoney,
  notes: optText(2000),
})
export type ContributionInput = z.input<typeof contributionSchema>

export const workSchema = z.object({
  id: z.string().uuid().optional(),
  // <input type="month"> gives YYYY-MM; stored as the first of the month.
  month: z
    .string()
    .regex(/^\d{4}-\d{2}(-\d{2})?$/, 'Choose a month')
    .transform((m) => `${m.slice(0, 7)}-01`),
  shareholder_id: z.string().uuid('Choose a partner'),
  hours: z.coerce.number().min(0, 'Hours must be 0 or more').max(100000),
  hour_rate: nonNegMoney,
})
export type WorkInput = z.input<typeof workSchema>

export const meetingAttachmentSchema = z.object({
  name: z.string().trim().min(1, 'Name the attachment').max(200),
  url: z.string().trim().min(1).max(500),
})

export const meetingSchema = z.object({
  id: z.string().uuid().optional(),
  meeting_date: ymd,
  title: z.string().trim().min(1, 'Title is required').max(200),
  participants: z.array(z.string().trim().min(1).max(120)).max(100).default([]),
  agenda: optText(20000),
  decisions: optText(20000),
  action_items: optText(20000),
  attachments: z.array(meetingAttachmentSchema).max(50).default([]),
})
export type MeetingInput = z.input<typeof meetingSchema>

/**
 * Rows of founding_contributions / shareholder_work created before the FK
 * existed only carry the partner's name. Match by id when present, else by name.
 */
export function matchesPartner(row: { shareholder_id: string | null; shareholder: string }, partner: { id: string; name: string }) {
  if (row.shareholder_id) return row.shareholder_id === partner.id
  return row.shareholder.trim().toLowerCase() === partner.name.trim().toLowerCase()
}

export { money }
