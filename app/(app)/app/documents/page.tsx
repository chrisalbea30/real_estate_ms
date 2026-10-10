import type { Metadata } from 'next'
import { pageContext } from '@/lib/page'
import { createServerSupabase } from '@/lib/supabase/server'
import { DocumentsClient } from '@/components/documents/DocumentsClient'
import type { CompanyDocument } from '@/lib/types'

export const metadata: Metadata = { title: 'Documents' }

export default async function DocumentsPage() {
  const ctx = await pageContext('documents')
  const supabase = await createServerSupabase()
  const { data } = await supabase
    .from('company_documents')
    .select('*')
    .eq('organization_id', ctx.org.id)
    .order('document_date', { ascending: false, nullsFirst: false })
    .order('name')
    .limit(3000)
  return <DocumentsClient documents={(data ?? []) as CompanyDocument[]} />
}
