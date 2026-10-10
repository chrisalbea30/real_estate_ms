import { z } from 'zod'
import { optText } from '@/lib/schemas/guests'
import type { WebCredential } from '@/lib/types'

export const credentialSchema = z.object({
  id: z.string().uuid().optional(),
  service_name: z.string().trim().min(1, 'Service name is required').max(120),
  url: optText(500),
  username: optText(200),
  /** Write-only: encrypted server-side. Empty on edit keeps the stored password. */
  password: z.union([z.string().max(1000), z.null()]).optional(),
  notes: optText(4000),
})
export type CredentialInput = z.input<typeof credentialSchema>

/** What the list and the client ever see: no ciphertext, no legacy column. */
export type WebCredentialSafe = Omit<WebCredential, 'password_enc'>
export const CREDENTIAL_SAFE_COLUMNS = 'id, organization_id, service_name, url, username, notes, created_by, created_at, updated_at'

/** Trims and prefixes https:// when no scheme is given. Returns null for blank input. */
export function normaliseUrl(value: string | null | undefined): string | null {
  const v = (value ?? '').trim()
  if (!v) return null
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(v) ? v : `https://${v}`
}
