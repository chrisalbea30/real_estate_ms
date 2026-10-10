import type { Metadata } from 'next'
import { pageContext } from '@/lib/page'
import { createServerSupabase } from '@/lib/supabase/server'
import { AccountsClient } from '@/components/accounts/AccountsClient'
import type { AccountBalance, AccountMovement } from '@/lib/types'

export const metadata: Metadata = { title: 'Accounts' }

export default async function AccountsPage() {
  const ctx = await pageContext('accounts')
  const supabase = await createServerSupabase()
  const [accounts, movements] = await Promise.all([
    supabase.from('account_balances_v').select('*').eq('organization_id', ctx.org.id).order('sort').order('name'),
    supabase.from('account_movements').select('*').eq('organization_id', ctx.org.id).order('occurred_on', { ascending: false }).order('created_at', { ascending: false }).limit(500),
  ])
  return <AccountsClient accounts={(accounts.data ?? []) as AccountBalance[]} movements={(movements.data ?? []) as AccountMovement[]} />
}
