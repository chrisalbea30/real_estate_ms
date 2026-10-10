import type { Metadata } from 'next'
import { pageContext } from '@/lib/page'
import { createServerSupabase } from '@/lib/supabase/server'
import { PaymentsClient } from '@/components/settings/PaymentsClient'
import type { Account, PaymentMethod } from '@/lib/types'

export const metadata: Metadata = { title: 'Payment methods' }

export default async function PaymentsSettingsPage() {
  const ctx = await pageContext('settings')
  const supabase = await createServerSupabase()
  const [methods, accounts] = await Promise.all([
    supabase.from('payment_methods').select('*').eq('organization_id', ctx.org.id).order('sort').order('name'),
    // Needs accounts.view; members without it see an empty list and a hint.
    supabase.from('accounts').select('id, name, type, currency, active').eq('organization_id', ctx.org.id).order('sort').order('name'),
  ])
  return <PaymentsClient methods={(methods.data ?? []) as PaymentMethod[]} accounts={(accounts.data ?? []) as Pick<Account, 'id' | 'name' | 'type' | 'currency' | 'active'>[]} />
}
