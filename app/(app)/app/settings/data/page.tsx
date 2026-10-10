import type { Metadata } from 'next'
import { pageContext } from '@/lib/page'
import { createServerSupabase } from '@/lib/supabase/server'
import { DataClient } from '@/components/settings/DataClient'
import type { AuditLogRow } from '@/lib/types'

export const metadata: Metadata = { title: 'Data: export, reset, audit log' }

export default async function DataSettingsPage() {
  const ctx = await pageContext('settings')
  const supabase = await createServerSupabase()
  const { data } = await supabase.from('audit_log').select('*').eq('organization_id', ctx.org.id).order('created_at', { ascending: false }).limit(500)
  const rows = (data ?? []) as AuditLogRow[]

  const actorIds = [...new Set(rows.map((r) => r.actor).filter((a): a is string => !!a))]
  const actors: Record<string, string> = {}
  if (actorIds.length > 0) {
    const { data: profiles } = await supabase.from('profiles').select('id, full_name, email').in('id', actorIds)
    for (const p of profiles ?? []) actors[p.id] = p.full_name || p.email || 'Member'
  }

  return <DataClient audit={rows} actors={actors} orgName={ctx.org.name} timezone={ctx.property.timezone} />
}
