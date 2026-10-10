'use server'

import { revalidatePath } from 'next/cache'
import { requireContext, requirePerm, AppError } from '@/lib/context'
import { createServerSupabase } from '@/lib/supabase/server'
import { run, must, mustOk, type ActionResult } from '@/lib/actions'
import { num } from '@/lib/schemas/guests'
import {
  roomSetupSchema,
  revenueCellSchema,
  revenueCellKeySchema,
  expenseItemSchema,
  expenseCopySchema,
  expenseNewItemSchema,
  rentSchema,
  budgetYear,
  type RoomSetupInput,
  type RevenueCellInput,
  type RevenueCellKey,
  type ExpenseItemInput,
  type ExpenseCopyInput,
  type ExpenseNewItemInput,
  type RentInput,
} from '@/lib/schemas/budget'
import type { BudgetRevenue, BudgetExpense, BudgetRent, BudgetRoomSetup } from '@/lib/types'

function refresh() {
  revalidatePath('/app/budget')
  revalidatePath('/app/partner-dashboard')
}

// ---------------------------------------------------------------------------
// Setup (budget_room_setup)
// ---------------------------------------------------------------------------

export async function saveRoomSetupAction(input: RoomSetupInput): Promise<ActionResult<BudgetRoomSetup>> {
  return run(async () => {
    const data = roomSetupSchema.parse(input)
    const ctx = await requirePerm('budget', data.id ? 'edit' : 'add')
    const supabase = await createServerSupabase()
    const payload = {
      year: data.year,
      room_name: data.room_name,
      high_season_rate_thb: num(data.high_season_rate_thb),
      low_season_rate_thb: num(data.low_season_rate_thb),
      target_occupancy_pct: num(data.target_occupancy_pct),
      notes: data.notes || null,
    }
    const row = data.id
      ? must(await supabase.from('budget_room_setup').update(payload).eq('id', data.id).eq('organization_id', ctx.org.id).select().single(), 'Update room setup')
      : must(await supabase.from('budget_room_setup').insert({ ...payload, organization_id: ctx.org.id, property_id: ctx.property.id }).select().single(), 'Create room setup')
    refresh()
    return row as BudgetRoomSetup
  })
}

export async function deleteRoomSetupAction(id: string): Promise<ActionResult<undefined>> {
  return run(async () => {
    const ctx = await requirePerm('budget', 'delete')
    const supabase = await createServerSupabase()
    mustOk(await supabase.from('budget_room_setup').delete().eq('id', id).eq('organization_id', ctx.org.id))
    refresh()
    return undefined
  })
}

/** Inserts an empty setup row for every active room of the property that has none for the year. */
export async function createSetupRowsForAllRoomsAction(yearInput: number | string): Promise<ActionResult<{ created: number }>> {
  return run(async () => {
    const year = budgetYear.parse(yearInput)
    const ctx = await requirePerm('budget', 'add')
    const supabase = await createServerSupabase()
    const rooms = must(await supabase.from('rooms').select('name').eq('property_id', ctx.property.id).eq('active', true).order('number'), 'Rooms')
    const existing = must(await supabase.from('budget_room_setup').select('room_name').eq('property_id', ctx.property.id).eq('year', year), 'Room setup')
    const have = new Set(existing.map((r) => r.room_name))
    const missing = rooms.map((r) => r.name).filter((n) => !have.has(n))
    if (missing.length === 0) return { created: 0 }
    mustOk(
      await supabase.from('budget_room_setup').insert(
        missing.map((room_name) => ({ organization_id: ctx.org.id, property_id: ctx.property.id, year, room_name })),
      ),
    )
    refresh()
    return { created: missing.length }
  })
}

// ---------------------------------------------------------------------------
// Revenue matrix (budget_revenue)
// ---------------------------------------------------------------------------

/** Sets a matrix cell: updates the first existing entry, otherwise inserts one. */
export async function setRevenueCellAction(input: RevenueCellInput): Promise<ActionResult<BudgetRevenue>> {
  return run(async () => {
    const data = revenueCellSchema.parse(input)
    const ctx = await requireContext()
    const supabase = await createServerSupabase()
    const existing = must(
      await supabase
        .from('budget_revenue')
        .select('id')
        .eq('property_id', ctx.property.id)
        .eq('year', data.year)
        .eq('month', data.month)
        .eq('room_name', data.room_name)
        .order('created_at', { ascending: true })
        .limit(1),
      'Budget revenue',
    )
    const first = existing[0]
    await requirePerm('budget', first ? 'edit' : 'add')
    const payload = { amount_thb: num(data.amount_thb) ?? 0, season: data.season || null }
    const row = first
      ? must(await supabase.from('budget_revenue').update(payload).eq('id', first.id).eq('organization_id', ctx.org.id).select().single(), 'Update budget revenue')
      : must(
          await supabase
            .from('budget_revenue')
            .insert({ ...payload, year: data.year, month: data.month, room_name: data.room_name, organization_id: ctx.org.id, property_id: ctx.property.id })
            .select()
            .single(),
          'Create budget revenue',
        )
    refresh()
    return row as BudgetRevenue
  })
}

/** Deletes every entry of a matrix cell. */
export async function clearRevenueCellAction(input: RevenueCellKey): Promise<ActionResult<undefined>> {
  return run(async () => {
    const key = revenueCellKeySchema.parse(input)
    const ctx = await requirePerm('budget', 'delete')
    const supabase = await createServerSupabase()
    mustOk(
      await supabase
        .from('budget_revenue')
        .delete()
        .eq('organization_id', ctx.org.id)
        .eq('property_id', ctx.property.id)
        .eq('year', key.year)
        .eq('month', key.month)
        .eq('room_name', key.room_name),
    )
    refresh()
    return undefined
  })
}

// ---------------------------------------------------------------------------
// Expense items (budget_expenses)
// ---------------------------------------------------------------------------

export async function saveBudgetExpenseAction(input: ExpenseItemInput): Promise<ActionResult<BudgetExpense>> {
  return run(async () => {
    const data = expenseItemSchema.parse(input)
    const ctx = await requirePerm('budget', data.id ? 'edit' : 'add')
    const supabase = await createServerSupabase()
    const payload = {
      year: data.year,
      month: data.month,
      category: data.category,
      subcategory: data.subcategory || null,
      item_name: data.item_name,
      amount_thb: num(data.amount_thb) ?? 0,
      expense_type: data.expense_type,
    }
    const row = data.id
      ? must(await supabase.from('budget_expenses').update(payload).eq('id', data.id).eq('organization_id', ctx.org.id).select().single(), 'Update budget expense')
      : must(await supabase.from('budget_expenses').insert({ ...payload, organization_id: ctx.org.id, property_id: ctx.property.id }).select().single(), 'Create budget expense')
    refresh()
    return row as BudgetExpense
  })
}

export async function deleteBudgetExpenseAction(id: string): Promise<ActionResult<undefined>> {
  return run(async () => {
    const ctx = await requirePerm('budget', 'delete')
    const supabase = await createServerSupabase()
    mustOk(await supabase.from('budget_expenses').delete().eq('id', id).eq('organization_id', ctx.org.id))
    refresh()
    return undefined
  })
}

/** Writes the same amount to all 12 months of an item: first entry of each month is updated, missing months are inserted. */
export async function copyBudgetExpenseToAllMonthsAction(input: ExpenseCopyInput): Promise<ActionResult<{ updated: number; inserted: number }>> {
  return run(async () => {
    const data = expenseCopySchema.parse(input)
    const ctx = await requirePerm('budget', 'edit')
    const supabase = await createServerSupabase()
    const amount = num(data.amount_thb) ?? 0
    const existing = must(
      await supabase
        .from('budget_expenses')
        .select('id, month, created_at')
        .eq('property_id', ctx.property.id)
        .eq('year', data.year)
        .eq('expense_type', data.expense_type)
        .eq('category', data.category)
        .eq('item_name', data.item_name)
        .order('created_at', { ascending: true }),
      'Budget expenses',
    )
    const firstByMonth = new Map<number, string>()
    for (const e of existing) if (!firstByMonth.has(e.month)) firstByMonth.set(e.month, e.id)
    const ids = [...firstByMonth.values()]
    if (ids.length > 0) {
      mustOk(await supabase.from('budget_expenses').update({ amount_thb: amount, subcategory: data.subcategory || null }).in('id', ids).eq('organization_id', ctx.org.id))
    }
    const missing = Array.from({ length: 12 }, (_, i) => i + 1).filter((m) => !firstByMonth.has(m))
    if (missing.length > 0) {
      await requirePerm('budget', 'add')
      mustOk(
        await supabase.from('budget_expenses').insert(
          missing.map((month) => ({
            organization_id: ctx.org.id,
            property_id: ctx.property.id,
            year: data.year,
            month,
            category: data.category,
            subcategory: data.subcategory || null,
            item_name: data.item_name,
            amount_thb: amount,
            expense_type: data.expense_type,
          })),
        ),
      )
    }
    refresh()
    return { updated: ids.length, inserted: missing.length }
  })
}

/**
 * Adds a new item row. With an amount and months='all' it creates 12 entries;
 * with a single month it creates one; without an amount it creates a zero
 * placeholder in January so the row appears in the matrix.
 */
export async function addBudgetExpenseItemAction(input: ExpenseNewItemInput): Promise<ActionResult<{ created: number }>> {
  return run(async () => {
    const data = expenseNewItemSchema.parse(input)
    const ctx = await requirePerm('budget', 'add')
    const supabase = await createServerSupabase()
    const dup = must(
      await supabase
        .from('budget_expenses')
        .select('id')
        .eq('property_id', ctx.property.id)
        .eq('year', data.year)
        .eq('expense_type', data.expense_type)
        .eq('category', data.category)
        .eq('item_name', data.item_name)
        .limit(1),
      'Budget expenses',
    )
    if (dup.length > 0) throw new AppError('That item already exists in this category. Tap its cells to edit it.')
    const amount = num(data.amount_thb)
    const months = amount === null ? [1] : data.months === 'all' ? Array.from({ length: 12 }, (_, i) => i + 1) : [data.months]
    mustOk(
      await supabase.from('budget_expenses').insert(
        months.map((month) => ({
          organization_id: ctx.org.id,
          property_id: ctx.property.id,
          year: data.year,
          month,
          category: data.category,
          item_name: data.item_name,
          amount_thb: amount ?? 0,
          expense_type: data.expense_type,
        })),
      ),
    )
    refresh()
    return { created: months.length }
  })
}

// ---------------------------------------------------------------------------
// Rent schedule (budget_rent)
// ---------------------------------------------------------------------------

export async function saveRentAction(input: RentInput): Promise<ActionResult<BudgetRent>> {
  return run(async () => {
    const data = rentSchema.parse(input)
    const ctx = await requirePerm('budget', data.id ? 'edit' : 'add')
    const supabase = await createServerSupabase()
    const payload = { year_number: data.year_number, year_label: data.year_label || null, rent_thb: data.rent_thb, vat_amount: num(data.vat_amount) }
    const row = data.id
      ? must(await supabase.from('budget_rent').update(payload).eq('id', data.id).eq('organization_id', ctx.org.id).select().single(), 'Update rent year')
      : must(await supabase.from('budget_rent').insert({ ...payload, organization_id: ctx.org.id, property_id: ctx.property.id }).select().single(), 'Create rent year')
    refresh()
    return row as BudgetRent
  })
}

export async function deleteRentAction(id: string): Promise<ActionResult<undefined>> {
  return run(async () => {
    const ctx = await requirePerm('budget', 'delete')
    const supabase = await createServerSupabase()
    mustOk(await supabase.from('budget_rent').delete().eq('id', id).eq('organization_id', ctx.org.id))
    refresh()
    return undefined
  })
}
