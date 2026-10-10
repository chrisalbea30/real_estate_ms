import { z } from 'zod'
import { ymdOptional, optText } from '@/lib/schemas/guests'

export const DEFAULT_DOCUMENT_CATEGORY = 'Other'

export const documentSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, 'Name is required').max(200),
  category: optText(80),
  document_date: ymdOptional,
  file_url: optText(500),
  notes: optText(4000),
  uploaded_by: optText(120),
})
export type DocumentInput = z.input<typeof documentSchema>

/** Lower-case file extension of a storage path or URL ('' when none). */
export function fileExtension(value: string | null | undefined): string {
  if (!value) return ''
  const last = value.split('?')[0]!.split('#')[0]!.split('/').pop() ?? ''
  const dot = last.lastIndexOf('.')
  return dot > 0 ? last.slice(dot + 1).toLowerCase() : ''
}
