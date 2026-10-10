import type { Metadata } from 'next'
import { pageContext } from '@/lib/page'
import { createServerSupabase } from '@/lib/supabase/server'
import { fetchAll } from '@/lib/supabase/fetchAll'
import { MeetingsClient } from '@/components/meetings/MeetingsClient'
import type { Meeting } from '@/lib/types'

export const metadata: Metadata = { title: 'Meetings' }

export default async function MeetingsPage() {
  const ctx = await pageContext('shareholder_meetings')
  const supabase = await createServerSupabase()
  const meetings = await fetchAll<Meeting>((from, to) =>
    supabase.from('shareholder_meetings').select('*').eq('organization_id', ctx.org.id).order('meeting_date', { ascending: false }).order('created_at', { ascending: false }).order('id').range(from, to),
  )
  return <MeetingsClient meetings={meetings} />
}
