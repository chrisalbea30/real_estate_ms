'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/Modal'
import { TextField, SelectField, TextareaField, CheckboxField, FormGrid, FormError } from '@/components/ui/Field'
import { Spinner } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/Toast'
import { useApp } from '@/components/app/AppProvider'
import { saveTaskAction } from '@/app/(app)/app/tasks/actions'
import { TASK_STATUSES, type Task, type TaskStatus } from '@/lib/types'

const emptyForm = () => ({
  project: '',
  department: '',
  topic: '',
  responsible_person: '',
  assignee_user_id: '',
  target_date: '',
  status: 'Pending' as TaskStatus,
  status_notes: '',
  visible_to_gm: false,
})
type Form = ReturnType<typeof emptyForm>

function fromTask(t: Partial<Task>): Form {
  return {
    ...emptyForm(),
    project: t.project ?? '',
    department: t.department ?? '',
    topic: t.topic ?? '',
    responsible_person: t.responsible_person ?? '',
    assignee_user_id: t.assignee_user_id ?? '',
    target_date: t.target_date ?? '',
    status: t.status ?? 'Pending',
    status_notes: t.status_notes ?? '',
    visible_to_gm: t.visible_to_gm ?? false,
  }
}

export function TaskModal({ task, onClose }: { task: Partial<Task> | null; onClose: () => void }) {
  const router = useRouter()
  const toast = useToast()
  const { categories, partners, members } = useApp()
  const [form, setForm] = useState<Form>(emptyForm)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [key, setKey] = useState<string | null>(null)

  // Re-initialise when a different task is opened.
  const k = task ? task.id ?? 'new' : null
  if (k !== key) {
    setKey(k)
    if (task) setForm(fromTask(task))
    setError(null)
    setErrors({})
  }

  const projects = categories('task_project')
  const departments = useMemo(() => {
    const list = categories('task_department')
    return form.department && !list.includes(form.department) ? [form.department, ...list] : list
  }, [categories, form.department])
  const people = useMemo(() => {
    const set = new Set<string>(['General Manager'])
    partners.forEach((p) => set.add(p.name))
    members.forEach((m) => set.add(m.name))
    return [...set]
  }, [partners, members])

  const set = <K extends keyof Form>(name: K, value: Form[K]) => setForm((f) => ({ ...f, [name]: value }))
  const input = (name: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => set(name, e.target.value as never)

  const chooseAssignee = (userId: string) => {
    const member = members.find((m) => m.user_id === userId)
    setForm((f) => ({ ...f, assignee_user_id: userId, responsible_person: member ? member.name : f.responsible_person }))
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const res = await saveTaskAction({ id: task?.id, ...form })
    setBusy(false)
    if (!res.ok) {
      setError(res.error)
      setErrors(res.fieldErrors ?? {})
      return
    }
    toast.success(task?.id ? 'Task updated' : 'Task added')
    onClose()
    router.refresh()
  }

  return (
    <Modal
      open={!!task}
      onClose={onClose}
      title={task?.id ? 'Edit task' : 'New task'}
      footer={
        <div className="flex justify-end gap-2">
          <button className="btn-secondary" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" form="task-form" disabled={busy}>
            {busy ? <Spinner size="sm" /> : 'Save task'}
          </button>
        </div>
      }
    >
      <form id="task-form" onSubmit={submit}>
        <FormGrid>
          <FormError error={error} />
          <TextField label="Topic" required value={form.topic} onChange={input('topic')} error={errors.topic} containerClassName="sm:col-span-2" placeholder="What needs to be done" autoFocus />
          <TextField label="Project" value={form.project} onChange={input('project')} error={errors.project} list="task-projects" placeholder="Choose or type a project" autoComplete="off" />
          <datalist id="task-projects">
            {projects.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
          <SelectField label="Department" value={form.department} onChange={input('department')} options={departments} placeholder="None" error={errors.department} />
          <SelectField
            label="Assign to team member"
            value={form.assignee_user_id}
            onChange={(e) => chooseAssignee(e.target.value)}
            options={members.map((m) => ({ value: m.user_id, label: m.name }))}
            placeholder="Not assigned"
            error={errors.assignee_user_id}
            hint="Shows in that person's “Assigned to me” list"
          />
          <TextField label="Responsible person" value={form.responsible_person} onChange={input('responsible_person')} error={errors.responsible_person} list="task-people" placeholder="Name or General Manager" autoComplete="off" />
          <datalist id="task-people">
            {people.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
          <TextField label="Target date" type="date" value={form.target_date} onChange={input('target_date')} error={errors.target_date} />
          <SelectField label="Status" value={form.status} onChange={input('status')} options={TASK_STATUSES} error={errors.status} />
          <TextareaField label="Status notes" value={form.status_notes} onChange={input('status_notes')} rows={3} containerClassName="sm:col-span-2" error={errors.status_notes} />
          <CheckboxField className="sm:col-span-2" label="Visible to managers" description="Managers see this task on their operations dashboard even when it is assigned to a partner." checked={form.visible_to_gm} onChange={(v) => set('visible_to_gm', v)} />
        </FormGrid>
      </form>
    </Modal>
  )
}
