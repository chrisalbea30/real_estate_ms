import type { Metadata } from 'next'
import { pageContext } from '@/lib/page'
import { createServerSupabase } from '@/lib/supabase/server'
import { isEncryptionConfigured } from '@/lib/crypto'
import { CREDENTIAL_SAFE_COLUMNS, type WebCredentialSafe } from '@/lib/schemas/logins'
import { LoginsClient } from '@/components/logins/LoginsClient'

export const metadata: Metadata = { title: 'Log-in vault' }

export default async function LoginsPage() {
  const ctx = await pageContext('logins')
  const supabase = await createServerSupabase()
  // Never select password_enc (or the legacy password column) for the list.
  const { data } = await supabase
    .from('web_credentials')
    .select(CREDENTIAL_SAFE_COLUMNS)
    .eq('organization_id', ctx.org.id)
    .order('service_name')
    .limit(3000)
  return <LoginsClient credentials={(data ?? []) as unknown as WebCredentialSafe[]} encryptionReady={isEncryptionConfigured()} />
}
