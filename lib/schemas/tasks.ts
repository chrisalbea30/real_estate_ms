import { z } from 'zod'
import { ymdOptional, optText } from '@/lib/schemas/guests'
import { TASK_STATUSES } from '@/lib/types'

export const taskStatus = z.enum(TASK_STATUSES)

export const taskSchema = z.object({
  id: z.string().uuid().optional(),
  project: optText(80),
  department: optText(80),
  topic: z.string().trim().min(1, 'Topic is required').max(200),
  responsible_person: optText(120),
  assignee_user_id: z.union([z.string().uuid(), z.literal(''), z.null()]).optional(),
  target_date: ymdOptional,
  status: taskStatus.default('Pending'),
  status_notes: optText(4000),
  visible_to_gm: z.boolean().default(false),
})
export type TaskInput = z.input<typeof taskSchema>

export const taskStatusChangeSchema = z.object({
  id: z.string().uuid(),
  status: taskStatus,
})
