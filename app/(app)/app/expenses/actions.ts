'use server'

import { revalidatePath } from 'next/cache'
import { requirePerm } from '@/lib/context'
import { createServerSupabase, type ServerSupabase } from '@/lib/supabase/server'
import { fetchAll } from '@/lib/supabase/fetchAll'
import { run, must, mustOk, type ActionResult } from '@/lib/actions'
import { expenseSchema, type ExpenseInput } from '@/lib/schemas/expenses'
import { num } from '@/lib/schemas/guests'
import { buildRateTable, rateBetween } from '@/lib/currency'
import type { Expense, ExchangeRate } from '@/lib/types'

function refresh() {
  revalidatePath('/app/expenses')
  revalidatePath('/app')
  revalidatePath('/app/legal')
  revalidatePath('/app/accounts')
  revalidatePath('/app/partner-dashboard')
  revalidatePath('/app/budget')
  revalidatePath('/app/operations')
}

const pad3 = (n: number) => String(n).padStart(3, '0')

/**
 * Next "Expense NNN" transaction number and next purely numeric document
 * number for the organisation (max + 1, 3 digits).
 */
async function nextNumbers(supabase: ServerSupabase, orgId: string) {
  const rows = await fetchAll<Pick<Expense, 'transaction_number' | 'document_number'>>((from, to) =>
    supabase.from('expenses').select('transaction_number, document_number').eq('organization_id', orgId).order('created_at').order('id').range(from, to),
  )
  let maxTx = 0
  let maxDoc = 0
  for (const r of rows) {
    const m = /^Expense\s+0*(\d+)$/i.exec((r.transaction_number ?? '').trim())
    if (m) maxTx = Math.max(maxTx, Number(m[1]))
    const d = (r.document_number ?? '').trim()
    if (/^\d+$/.test(d)) maxDoc = Math.max(maxDoc, Number(d))
  }
  return { transaction: `Expense ${pad3(maxTx + 1)}`, document: pad3(maxDoc + 1) }
}

export type SaveExpenseResult = { expense: Expense; warning: string | null }

export async function saveExpenseAction(input: ExpenseInput): Promise<ActionResult<SaveExpenseResult>> {
  return run(async () => {
    const data = expenseSchema.parse(input)
    const ctx = await requirePerm('expenses', data.id ? 'edit' : 'add')
    const supabase = await createServerSupabase()

    const base = (ctx.org.settings.base_currency ?? 'EUR').toUpperCase()
    const currency = data.currency || base
    const amount = num(data.amount) ?? 0

    // FX: amount_base is what dashboards sum and what the ledger trigger posts.
    let amountBase: number | null = amount
    let fxRate: number | null = 1
    let warning: string | null = null
    if (currency !== base) {
      const rates = must(await supabase.from('exchange_rates').select('*'), 'Exchange rates') as ExchangeRate[]
      const rate = rateBetween(currency, base, buildRateTable(rates))
      if (rate == null) {
        amountBase = null
        fxRate = null
        warning = `No exchange rate for ${currency} → ${base} yet, so this expense has no ${base} value and is left out of totals until rates are refreshed.`
      } else {
        amountBase = Math.round(amount * rate * 100) / 100
        fxRate = rate
      }
    }

    let methodLabel: string | null = data.method?.trim() || null
    if (data.payment_method_id) {
      const pm = must(await supabase.from('payment_methods').select('name').eq('id', data.payment_method_id).eq('organization_id', ctx.org.id).single(), 'Payment method')
      methodLabel = pm.name
    }

    let transaction = data.transaction_number?.trim() || null
    let document = data.document_number?.trim() || null
    if (!data.id && (!transaction || !document)) {
      const next = await nextNumbers(supabase, ctx.org.id)
      transaction = transaction ?? next.transaction
      document = document ?? next.document
    }

    const payload = {
      payment_date: data.payment_date,
      transaction_number: transaction,
      document_number: document,
      category: data.category || null,
      subcategory: data.subcategory || null,
      supplier: data.supplier || null,
      amount,
      currency,
      amount_base: amountBase,
      fx_rate: fxRate,
      method: methodLabel,
      payment_method_id: data.payment_method_id || null,
      paid_by: data.paid_by || null,
      audit: data.audit,
      type: data.type || null,
      description: data.description || null,
      is_legal: data.is_legal,
      file_url: data.file_url || null,
    }

    const row = data.id
      ? must(await supabase.from('expenses').update(payload).eq('id', data.id).eq('organization_id', ctx.org.id).select().single(), 'Update expense')
      : must(await supabase.from('expenses').insert({ ...payload, organization_id: ctx.org.id, property_id: ctx.property.id }).select().single(), 'Create expense')
    refresh()
    return { expense: row as Expense, warning }
  })
}

export async function deleteExpenseAction(id: string): Promise<ActionResult<undefined>> {
  return run(async () => {
    const ctx = await requirePerm('expenses', 'delete')
    const supabase = await createServerSupabase()
    mustOk(await supabase.from('expenses').delete().eq('id', id).eq('organization_id', ctx.org.id))
    refresh()
    return undefined
  })
}
