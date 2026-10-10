import type { Metadata } from 'next'
import { pageContext } from '@/lib/page'
import { createServerSupabase } from '@/lib/supabase/server'
import { fetchAll } from '@/lib/supabase/fetchAll'
import { ExpensesClient } from '@/components/expenses/ExpensesClient'
import type { Expense } from '@/lib/types'

export const metadata: Metadata = { title: 'Expenses' }

export default async function ExpensesPage() {
  const ctx = await pageContext('expenses')
  const supabase = await createServerSupabase()
  const expenses = await fetchAll<Expense>((from, to) =>
    supabase.from('expenses').select('*').eq('organization_id', ctx.org.id).order('payment_date', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false }).order('id').range(from, to),
  )
  return <ExpensesClient expenses={expenses} />
}
