import { z } from 'zod'
import { ymd, ymdOptional, optText } from '@/lib/schemas/guests'
import { COMPLAINT_SEVERITIES, COMPLAINT_STATUSES, type ComplaintSeverity } from '@/lib/types'

export const complaintSchema = z.object({
  id: z.string().uuid().optional(),
  date: ymd,
  guest_name: z.string().trim().min(1, 'Guest name is required').max(120),
  room_id: z.union([z.string().uuid(), z.literal(''), z.null()]).optional(),
  category: optText(80),
  description: z.string().trim().min(1, 'Describe the complaint').max(4000),
  severity: z.enum(COMPLAINT_SEVERITIES).default('Medium'),
  status: z.enum(COMPLAINT_STATUSES).default('Open'),
  resolution_notes: optText(4000),
  resolved_at: ymdOptional,
  filed_by: optText(120),
})
export type ComplaintInput = z.input<typeof complaintSchema>

/** Badge tone per severity: Critical danger, High warning, Medium info, Low neutral. */
export function severityTone(severity: ComplaintSeverity | string | null | undefined): 'danger' | 'warning' | 'info' | 'neutral' {
  switch (severity) {
    case 'Critical':
      return 'danger'
    case 'High':
      return 'warning'
    case 'Medium':
      return 'info'
    default:
      return 'neutral'
  }
}

export const SEVERITY_RANK: Record<ComplaintSeverity, number> = { Low: 1, Medium: 2, High: 3, Critical: 4 }
