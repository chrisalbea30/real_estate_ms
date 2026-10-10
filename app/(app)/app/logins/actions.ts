'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requirePerm, AppError, type AppContext } from '@/lib/context'
import { createServerSupabase } from '@/lib/supabase/server'
import { run, must, mustOk, type ActionResult } from '@/lib/actions'
import { encryptSecret, decryptSecret, isEncryptionConfigured } from '@/lib/crypto'
import { credentialSchema, normaliseUrl, CREDENTIAL_SAFE_COLUMNS, type CredentialInput, type WebCredentialSafe } from '@/lib/schemas/logins'
import type { WebCredential } from '@/lib/types'

function refresh() {
  revalidatePath('/app/logins')
}

function userName(ctx: AppContext) {
  const m = ctx.memberships.find((x) => x.organization_id === ctx.org.id)
  return ctx.profile?.full_name || m?.display_name || ctx.email
}

function assertVaultReady() {
  if (!isEncryptionConfigured()) {
    throw new AppError('The log-in vault is not configured: set CREDENTIALS_ENCRYPTION_KEY on the server and restart.', 503)
  }
}

/**
 * Insert or update a stored log-in. The password is encrypted here and only
 * ever written to password_enc; the legacy plaintext `password` column is never
 * touched. An empty password on edit keeps the existing ciphertext.
 */
export async function saveCredentialAction(input: CredentialInput): Promise<ActionResult<WebCredentialSafe>> {
  return run(async () => {
    const data = credentialSchema.parse(input)
    const ctx = await requirePerm('logins', data.id ? 'edit' : 'add')
    assertVaultReady()
    const supabase = await createServerSupabase()

    const payload: Partial<WebCredential> = {
      service_name: data.service_name,
      url: normaliseUrl(data.url),
      username: data.username?.trim() || null,
      notes: data.notes?.trim() || null,
    }
    const password = data.password ?? ''
    if (password.length > 0) payload.password_enc = encryptSecret(password)
    else if (!data.id) payload.password_enc = null

    const row = data.id
      ? must(await supabase.from('web_credentials').update(payload).eq('id', data.id).eq('organization_id', ctx.org.id).select(CREDENTIAL_SAFE_COLUMNS).single(), 'Update log-in')
      : must(await supabase.from('web_credentials').insert({ ...payload, organization_id: ctx.org.id, created_by: userName(ctx) }).select(CREDENTIAL_SAFE_COLUMNS).single(), 'Add log-in')
    refresh()
    return row as unknown as WebCredentialSafe
  })
}

/** Decrypts one password for display. Re-checks the permission server-side. */
export async function revealPasswordAction(id: string): Promise<ActionResult<string>> {
  return run(async () => {
    const credentialId = z.string().uuid().parse(id)
    const ctx = await requirePerm('logins', 'view')
    assertVaultReady()
    const supabase = await createServerSupabase()
    const row = must(await supabase.from('web_credentials').select('id, password_enc').eq('id', credentialId).eq('organization_id', ctx.org.id).single(), 'Log-in') as { id: string; password_enc: string | null }
    if (!row.password_enc) throw new AppError('No password is stored for this log-in yet. Edit it to set one.')
    return decryptSecret(row.password_enc)
  })
}

export async function deleteCredentialAction(id: string): Promise<ActionResult<undefined>> {
  return run(async () => {
    const ctx = await requirePerm('logins', 'delete')
    const supabase = await createServerSupabase()
    mustOk(await supabase.from('web_credentials').delete().eq('id', id).eq('organization_id', ctx.org.id))
    refresh()
    return undefined
  })
}
