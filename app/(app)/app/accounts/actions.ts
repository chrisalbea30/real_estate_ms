'use server'

import { revalidatePath } from 'next/cache'
import { AppError, requirePerm } from '@/lib/context'
import { createServerSupabase } from '@/lib/supabase/server'
import { run, must, mustOk, type ActionResult } from '@/lib/actions'
import { accountSchema, adjustmentSchema, type AccountInput, type AdjustmentInput } from '@/lib/schemas/accounts'
import { num } from '@/lib/schemas/guests'
import type { Account, AccountMovement } from '@/lib/types'

function refresh() {
  revalidatePath('/app/accounts')
  revalidatePath('/app')
  revalidatePath('/app/operations')
  revalidatePath('/app/partner-dashboard')
}

export async function saveAccountAction(input: AccountInput): Promise<ActionResult<Account>> {
  return run(async () => {
    const data = accountSchema.parse(input)
    const ctx = await requirePerm('accounts', data.id ? 'edit' : 'add')
    const supabase = await createServerSupabase()
    const payload = {
      name: data.name,
      type: data.type,
      currency: data.currency || (ctx.org.settings.base_currency ?? 'EUR'),
      opening_balance: num(data.opening_balance) ?? 0,
      notes: data.notes || null,
      active: data.active,
    }
    const row = data.id
      ? must(await supabase.from('accounts').update(payload).eq('id', data.id).eq('organization_id', ctx.org.id).select().single(), 'Update account')
      : must(await supabase.from('accounts').insert({ ...payload, organization_id: ctx.org.id }).select().single(), 'Create account')
    refresh()
    return row as Account
  })
}

export async function deleteAccountAction(id: string): Promise<ActionResult<undefined>> {
  return run(async () => {
    const ctx = await requirePerm('accounts', 'delete')
    const supabase = await createServerSupabase()
    mustOk(await supabase.from('accounts').delete().eq('id', id).eq('organization_id', ctx.org.id))
    refresh()
    return undefined
  })
}

/** Manual balance correction: one ledger row with source_table = 'adjustment'. */
export async function adjustBalanceAction(input: AdjustmentInput): Promise<ActionResult<AccountMovement>> {
  return run(async () => {
    const data = adjustmentSchema.parse(input)
    const ctx = await requirePerm('accounts', 'add')
    const supabase = await createServerSupabase()
    must(await supabase.from('accounts').select('id').eq('id', data.account_id).eq('organization_id', ctx.org.id).single(), 'Account')
    const row = must(
      await supabase
        .from('account_movements')
        .insert({
          organization_id: ctx.org.id,
          account_id: data.account_id,
          amount: num(data.amount) ?? 0,
          occurred_on: data.occurred_on,
          description: data.description || 'Balance adjustment',
          source_table: 'adjustment',
          source_id: null,
        })
        .select()
        .single(),
      'Adjust balance',
    )
    refresh()
    return row as AccountMovement
  })
}

/** Only adjustments can be deleted; guest and expense movements are trigger-managed. */
export async function deleteMovementAction(id: string): Promise<ActionResult<undefined>> {
  return run(async () => {
    const ctx = await requirePerm('accounts', 'delete')
    const supabase = await createServerSupabase()
    const row = must(await supabase.from('account_movements').select('id, source_table').eq('id', id).eq('organization_id', ctx.org.id).single(), 'Movement')
    if (row.source_table !== 'adjustment') throw new AppError('This movement is posted automatically. Change the booking or expense instead.')
    mustOk(await supabase.from('account_movements').delete().eq('id', id).eq('organization_id', ctx.org.id).eq('source_table', 'adjustment'))
    refresh()
    return undefined
  })
}
