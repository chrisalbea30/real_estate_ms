'use server'

import { revalidatePath } from 'next/cache'
import { requirePerm, AppError } from '@/lib/context'
import { createServerSupabase, type ServerSupabase } from '@/lib/supabase/server'
import { run, must, mustOk, type ActionResult } from '@/lib/actions'
import { taskSchema, taskStatusChangeSchema, type TaskInput } from '@/lib/schemas/tasks'
import type { Task, TaskStatus } from '@/lib/types'

function refresh() {
  revalidatePath('/app/tasks')
  revalidatePath('/app')
  revalidatePath('/app/operations')
}

type MemberRow = {
  user_id: string
  display_name: string | null
  profiles: { full_name: string | null; email: string | null } | { full_name: string | null; email: string | null }[] | null
}

/** Name of an active member of the organisation; throws when the user is not a member. */
async function memberName(supabase: ServerSupabase, orgId: string, userId: string): Promise<string> {
  const res = await supabase
    .from('memberships')
    .select('user_id, display_name, profiles:profiles!memberships_profile_fkey(full_name, email)')
    .eq('organization_id', orgId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle()
  if (res.error) throw new Error(res.error.message)
  const m = res.data as MemberRow | null
  if (!m) throw new AppError('Choose a member of this organisation as the assignee')
  const p = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles
  return m.display_name || p?.full_name || p?.email || 'Member'
}

export async function saveTaskAction(input: TaskInput): Promise<ActionResult<Task>> {
  return run(async () => {
    const data = taskSchema.parse(input)
    const ctx = await requirePerm('tasks', data.id ? 'edit' : 'add')
    const supabase = await createServerSupabase()

    const assignee = data.assignee_user_id || null
    let responsible = data.responsible_person?.trim() || null
    if (assignee) {
      const name = await memberName(supabase, ctx.org.id, assignee)
      if (!responsible) responsible = name
    }

    const payload = {
      project: data.project?.trim() || null,
      department: data.department?.trim() || null,
      topic: data.topic,
      responsible_person: responsible,
      assignee_user_id: assignee,
      target_date: data.target_date || null,
      status: data.status,
      status_notes: data.status_notes?.trim() || null,
      visible_to_gm: data.visible_to_gm,
    }

    // updated_at is maintained by a trigger; never sent from here.
    const row = data.id
      ? must(await supabase.from('todos').update(payload).eq('id', data.id).eq('organization_id', ctx.org.id).select().single(), 'Update task')
      : must(await supabase.from('todos').insert({ ...payload, organization_id: ctx.org.id, property_id: ctx.property.id }).select().single(), 'Create task')
    refresh()
    return row as Task
  })
}

/** Quick status change from the list. Requires tasks.edit. */
export async function updateTaskStatusAction(id: string, status: TaskStatus): Promise<ActionResult<Task>> {
  return run(async () => {
    const data = taskStatusChangeSchema.parse({ id, status })
    const ctx = await requirePerm('tasks', 'edit')
    const supabase = await createServerSupabase()
    const row = must(await supabase.from('todos').update({ status: data.status }).eq('id', data.id).eq('organization_id', ctx.org.id).select().single(), 'Update status')
    refresh()
    return row as Task
  })
}

export async function deleteTaskAction(id: string): Promise<ActionResult<undefined>> {
  return run(async () => {
    const ctx = await requirePerm('tasks', 'delete')
    const supabase = await createServerSupabase()
    mustOk(await supabase.from('todos').delete().eq('id', id).eq('organization_id', ctx.org.id))
    refresh()
    return undefined
  })
}
