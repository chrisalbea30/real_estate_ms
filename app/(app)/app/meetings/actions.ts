'use server'

import { revalidatePath } from 'next/cache'
import { requirePerm } from '@/lib/context'
import { createServerSupabase } from '@/lib/supabase/server'
import { run, must, mustOk, type ActionResult } from '@/lib/actions'
import { meetingSchema, type MeetingInput } from '@/lib/schemas/partners'
import { BUCKET, isExternalUrl } from '@/lib/storage'
import type { Meeting, MeetingAttachment } from '@/lib/types'

function refresh() {
  revalidatePath('/app/meetings')
}

const storagePaths = (list: MeetingAttachment[] | null | undefined) => (list ?? []).map((a) => a.url).filter((u) => u && !isExternalUrl(u))

export async function saveMeetingAction(input: MeetingInput): Promise<ActionResult<Meeting>> {
  return run(async () => {
    const data = meetingSchema.parse(input)
    const ctx = await requirePerm('shareholder_meetings', data.id ? 'edit' : 'add')
    const supabase = await createServerSupabase()

    const payload = {
      meeting_date: data.meeting_date,
      title: data.title,
      participants: Array.from(new Set(data.participants)),
      agenda: data.agenda || null,
      decisions: data.decisions || null,
      action_items: data.action_items || null,
      attachments: data.attachments,
    }

    let row: Meeting
    if (data.id) {
      const before = must(await supabase.from('shareholder_meetings').select('id, attachments').eq('id', data.id).eq('organization_id', ctx.org.id).single(), 'Meeting')
      row = must(await supabase.from('shareholder_meetings').update(payload).eq('id', data.id).eq('organization_id', ctx.org.id).select().single(), 'Update meeting') as Meeting
      // Files removed from the list are deleted from storage (best effort).
      const keep = new Set(storagePaths(payload.attachments))
      const orphaned = storagePaths(before.attachments as MeetingAttachment[] | null).filter((p) => !keep.has(p))
      if (orphaned.length) await supabase.storage.from(BUCKET).remove(orphaned)
    } else {
      row = must(await supabase.from('shareholder_meetings').insert({ ...payload, organization_id: ctx.org.id }).select().single(), 'Create meeting') as Meeting
    }
    refresh()
    return row
  })
}

export async function deleteMeetingAction(id: string): Promise<ActionResult<undefined>> {
  return run(async () => {
    const ctx = await requirePerm('shareholder_meetings', 'delete')
    const supabase = await createServerSupabase()
    const before = must(await supabase.from('shareholder_meetings').select('id, attachments').eq('id', id).eq('organization_id', ctx.org.id).single(), 'Meeting')
    mustOk(await supabase.from('shareholder_meetings').delete().eq('id', id).eq('organization_id', ctx.org.id))
    const paths = storagePaths(before.attachments as MeetingAttachment[] | null)
    if (paths.length) await supabase.storage.from(BUCKET).remove(paths)
    refresh()
    return undefined
  })
}
