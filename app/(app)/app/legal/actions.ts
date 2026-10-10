'use server'

import { revalidatePath } from 'next/cache'
import { requirePerm } from '@/lib/context'
import { createServerSupabase } from '@/lib/supabase/server'
import { run, must, type ActionResult } from '@/lib/actions'
import { legalReviewSchema, type LegalReviewInput } from '@/lib/schemas/expenses'
import type { Expense } from '@/lib/types'

/**
 * Lawyer / accountant review. Updates ONLY the three review columns, which the
 * expenses_legal_review policy allows for anyone with legal.edit.
 */
export async function reviewExpenseAction(input: LegalReviewInput): Promise<ActionResult<Expense>> {
  return run(async () => {
    const data = legalReviewSchema.parse(input)
    const ctx = await requirePerm('legal', 'edit')
    const supabase = await createServerSupabase()
    const row = must(
      await supabase
        .from('expenses')
        .update({ legal_status: data.legal_status, legal_notes: data.legal_notes || null, legal_reviewed_at: data.legal_reviewed_at })
        .eq('id', data.id)
        .eq('organization_id', ctx.org.id)
        .eq('is_legal', true)
        .select()
        .single(),
      'Review expense',
    )
    revalidatePath('/app/legal')
    revalidatePath('/app/expenses')
    return row as Expense
  })
}
