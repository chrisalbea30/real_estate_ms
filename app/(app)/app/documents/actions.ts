'use server'

import { revalidatePath } from 'next/cache'
import { requirePerm, type AppContext } from '@/lib/context'
import { createServerSupabase } from '@/lib/supabase/server'
import { run, must, mustOk, type ActionResult } from '@/lib/actions'
import { documentSchema, DEFAULT_DOCUMENT_CATEGORY, type DocumentInput } from '@/lib/schemas/documents'
import { BUCKET, isExternalUrl } from '@/lib/storage'
import type { CompanyDocument } from '@/lib/types'

function refresh() {
  revalidatePath('/app/documents')
}

function userName(ctx: AppContext) {
  const m = ctx.memberships.find((x) => x.organization_id === ctx.org.id)
  return ctx.profile?.full_name || m?.display_name || ctx.email
}

const isStoragePath = (value: string | null | undefined): value is string => !!value && !isExternalUrl(value)

export async function saveDocumentAction(input: DocumentInput): Promise<ActionResult<CompanyDocument>> {
  return run(async () => {
    const data = documentSchema.parse(input)
    const ctx = await requirePerm('documents', data.id ? 'edit' : 'add')
    const supabase = await createServerSupabase()

    const payload = {
      name: data.name,
      category: data.category?.trim() || DEFAULT_DOCUMENT_CATEGORY,
      document_date: data.document_date || null,
      file_url: data.file_url?.trim() || null,
      notes: data.notes?.trim() || null,
      uploaded_by: data.uploaded_by?.trim() || userName(ctx),
    }

    if (data.id) {
      const prev = must(await supabase.from('company_documents').select('id, file_url').eq('id', data.id).eq('organization_id', ctx.org.id).single(), 'Document') as { id: string; file_url: string | null }
      const row = must(await supabase.from('company_documents').update(payload).eq('id', data.id).eq('organization_id', ctx.org.id).select().single(), 'Update document')
      // The previous file was replaced or removed: drop the orphaned storage object.
      if (isStoragePath(prev.file_url) && prev.file_url !== payload.file_url) {
        await supabase.storage.from(BUCKET).remove([prev.file_url])
      }
      refresh()
      return row as CompanyDocument
    }

    const row = must(await supabase.from('company_documents').insert({ ...payload, organization_id: ctx.org.id, property_id: ctx.property.id }).select().single(), 'Add document')
    refresh()
    return row as CompanyDocument
  })
}

export async function deleteDocumentAction(id: string): Promise<ActionResult<undefined>> {
  return run(async () => {
    const ctx = await requirePerm('documents', 'delete')
    const supabase = await createServerSupabase()
    const doc = must(await supabase.from('company_documents').select('id, file_url').eq('id', id).eq('organization_id', ctx.org.id).single(), 'Document') as { id: string; file_url: string | null }
    mustOk(await supabase.from('company_documents').delete().eq('id', id).eq('organization_id', ctx.org.id))
    if (isStoragePath(doc.file_url)) {
      await supabase.storage.from(BUCKET).remove([doc.file_url])
    }
    refresh()
    return undefined
  })
}
