import type { Metadata } from 'next'
import { pageContext } from '@/lib/page'
import { createServerSupabase } from '@/lib/supabase/server'
import { TasksClient } from '@/components/tasks/TasksClient'
import type { Task } from '@/lib/types'

export const metadata: Metadata = { title: 'Tasks' }

export default async function TasksPage() {
  const ctx = await pageContext('tasks')
  const supabase = await createServerSupabase()
  const { data } = await supabase
    .from('todos')
    .select('*')
    .eq('organization_id', ctx.org.id)
    .order('target_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(3000)
  return <TasksClient tasks={(data ?? []) as Task[]} />
}
