'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, Target, Eye, EyeOff, UserCheck, AlertTriangle } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataTable, CardRow, CardTitle, type Column } from '@/components/ui/DataTable'
import { Badge, statusTone } from '@/components/ui/Badge'
import { Chips } from '@/components/ui/Tabs'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/Toast'
import { useConfirm } from '@/components/ui/Confirm'
import { useApp } from '@/components/app/AppProvider'
import { cn, formatDate } from '@/lib/format'
import { deleteTaskAction, updateTaskStatusAction } from '@/app/(app)/app/tasks/actions'
import { TaskModal } from '@/components/tasks/TaskModal'
import { TASK_STATUSES, type Task, type TaskStatus } from '@/lib/types'

type StatusKey = 'all' | 'overdue' | TaskStatus

export function isOverdue(t: Pick<Task, 'target_date' | 'status'>, today: string) {
  return !!t.target_date && t.target_date < today && t.status !== 'Complete'
}

export function TasksClient({ tasks }: { tasks: Task[] }) {
  const router = useRouter()
  const toast = useToast()
  const confirm = useConfirm()
  const { can, today, categories, user, members } = useApp()
  const [editing, setEditing] = useState<Partial<Task> | null>(null)
  const [status, setStatus] = useState<StatusKey>('all')
  const [mine, setMine] = useState(false)
  const [department, setDepartment] = useState('')
  const [pending, setPending] = useState<string | null>(null)

  const canEdit = can('tasks', 'edit')
  const myName = user.name.trim().toLowerCase()
  const isMine = (t: Task) => t.assignee_user_id === user.id || (!!t.responsible_person && t.responsible_person.trim().toLowerCase() === myName)
  const assigneeName = (t: Task) => (t.assignee_user_id ? members.find((m) => m.user_id === t.assignee_user_id)?.name : undefined)

  const departments = useMemo(() => {
    const set = new Set(categories('task_department'))
    tasks.forEach((t) => t.department && set.add(t.department))
    return [...set]
  }, [tasks, categories])

  // Rows after the non-status filters; every chip (including All) counts these.
  const base = useMemo(() => tasks.filter((t) => (!mine || isMine(t)) && (!department || t.department === department)), [tasks, mine, department]) // eslint-disable-line react-hooks/exhaustive-deps

  const counts = useMemo(() => {
    const c: Record<StatusKey, number> = { all: base.length, overdue: 0, Pending: 0, Ongoing: 0, Complete: 0, Blocked: 0 }
    for (const t of base) {
      c[t.status] = (c[t.status] ?? 0) + 1
      if (isOverdue(t, today)) c.overdue++
    }
    return c
  }, [base, today])

  const filtered = useMemo(() => {
    const list = status === 'all' ? base : status === 'overdue' ? base.filter((t) => isOverdue(t, today)) : base.filter((t) => t.status === status)
    // Overdue first, then by target date (undated last), then newest first.
    return [...list].sort((a, b) => {
      const oa = isOverdue(a, today) ? 0 : 1
      const ob = isOverdue(b, today) ? 0 : 1
      if (oa !== ob) return oa - ob
      const da = a.target_date ?? '9999-12-31'
      const db = b.target_date ?? '9999-12-31'
      if (da !== db) return da < db ? -1 : 1
      return a.created_at < b.created_at ? 1 : -1
    })
  }, [base, status, today])

  const quickStatus = async (t: Task, next: TaskStatus) => {
    if (next === t.status) return
    setPending(t.id)
    const res = await updateTaskStatusAction(t.id, next)
    setPending(null)
    if (!res.ok) return toast.error(res.error)
    toast.success(`Task marked ${next.toLowerCase()}`)
    router.refresh()
  }

  const remove = async (t: Task) => {
    const ok = await confirm({ title: `Delete "${t.topic}"?`, message: 'This task is removed permanently.', confirmLabel: 'Delete', danger: true })
    if (!ok) return
    const res = await deleteTaskAction(t.id)
    if (!res.ok) return toast.error(res.error)
    toast.success('Task deleted')
    router.refresh()
  }

  const statusControl = (t: Task) =>
    canEdit ? (
      <select
        className="select !min-h-9 !py-1 !pl-2 !pr-7 text-xs w-auto"
        value={t.status}
        disabled={pending === t.id}
        onChange={(e) => quickStatus(t, e.target.value as TaskStatus)}
        aria-label={`Status of ${t.topic}`}
      >
        {TASK_STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    ) : (
      <Badge tone={statusTone(t.status)}>{t.status}</Badge>
    )

  const targetCell = (t: Task) => {
    const overdue = isOverdue(t, today)
    return (
      <span className={cn('inline-flex flex-wrap items-center gap-1.5', overdue && 'text-danger')}>
        {formatDate(t.target_date)}
        {overdue && (
          <Badge tone="danger">
            <AlertTriangle className="h-3 w-3" /> Overdue
          </Badge>
        )}
      </span>
    )
  }

  const columns: Column<Task>[] = [
    {
      key: 'topic',
      header: 'Topic',
      cell: (t) => (
        <div className="min-w-0 max-w-md">
          <div className="truncate font-medium">{t.topic}</div>
          <div className="mt-0.5 flex flex-wrap gap-1">
            {t.project && <Badge tone="primary">{t.project}</Badge>}
            {t.department && <Badge>{t.department}</Badge>}
          </div>
          {t.status_notes && <div className="mt-1 truncate text-xs text-muted">{t.status_notes}</div>}
        </div>
      ),
      sortValue: (t) => t.topic,
    },
    {
      key: 'responsible',
      header: 'Responsible',
      cell: (t) => (
        <span className="inline-flex items-center gap-1.5">
          {t.assignee_user_id && <UserCheck className="h-3.5 w-3.5 text-success" aria-label="Assigned to a team member" />}
          {t.responsible_person ?? assigneeName(t) ?? <span className="text-muted">—</span>}
        </span>
      ),
      sortValue: (t) => t.responsible_person ?? '',
      hide: 'lg',
    },
    { key: 'target', header: 'Target', cell: targetCell, sortValue: (t) => t.target_date ?? '9999-12-31', width: '11rem' },
    { key: 'status', header: 'Status', cell: statusControl, sortValue: (t) => t.status, width: '9rem' },
    {
      key: 'visible',
      header: 'Managers',
      cell: (t) => (t.visible_to_gm ? <Eye className="h-4 w-4 text-success" aria-label="Visible to managers" /> : <EyeOff className="h-4 w-4 text-muted/60" aria-label="Hidden from managers" />),
      sortValue: (t) => (t.visible_to_gm ? 1 : 0),
      align: 'center',
      hide: 'xl',
      width: '6rem',
    },
  ]

  const actions = (t: Task) => (
    <>
      {canEdit && (
        <button className="icon-btn !h-8 !w-8" title="Edit" onClick={() => setEditing(t)}>
          <Pencil className="h-4 w-4" />
        </button>
      )}
      {can('tasks', 'delete') && (
        <button className="icon-btn !h-8 !w-8 text-danger" title="Delete" onClick={() => remove(t)}>
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </>
  )

  const open = tasks.filter((t) => t.status !== 'Complete').length
  const overdueCount = tasks.filter((t) => isOverdue(t, today)).length

  return (
    <div>
      <PageHeader
        title="Tasks"
        subtitle={`${open} open · ${overdueCount} overdue`}
        actions={
          can('tasks', 'add') && (
            <button className="btn-primary" onClick={() => setEditing({})}>
              <Plus className="h-4 w-4" /> Add task
            </button>
          )
        }
      />

      <DataTable
        rows={filtered}
        columns={columns}
        rowKey={(t) => t.id}
        search={(t) => `${t.topic} ${t.project ?? ''} ${t.department ?? ''} ${t.responsible_person ?? ''} ${t.status_notes ?? ''}`}
        searchPlaceholder="Search topic, project, person…"
        toolbar={
          <>
            <Chips
              value={status}
              onChange={setStatus}
              options={[
                { key: 'all', label: 'All', badge: counts.all },
                { key: 'overdue', label: 'Overdue', badge: counts.overdue },
                ...TASK_STATUSES.map((s) => ({ key: s, label: s, badge: counts[s] })),
              ]}
            />
            <button
              type="button"
              onClick={() => setMine((v) => !v)}
              aria-pressed={mine}
              className={cn('badge border px-3 py-1 transition', mine ? 'border-primary bg-primary text-primary-fg' : 'border-line bg-surface text-ink-2 hover:bg-surface-2')}
            >
              <UserCheck className="h-3.5 w-3.5" /> Assigned to me
            </button>
            <select className="select !min-h-9 !py-1 !pl-2 !pr-7 text-xs w-auto" value={department} onChange={(e) => setDepartment(e.target.value)} aria-label="Department">
              <option value="">All departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </>
        }
        actions={actions}
        empty={
          tasks.length === 0 ? (
            <EmptyState icon={Target} title="No tasks yet" description="Track to-dos by department with a responsible person and a target date." action={can('tasks', 'add') && <button className="btn-primary" onClick={() => setEditing({})}>Add first task</button>} />
          ) : (
            <EmptyState icon={Target} title="No tasks match" description="Try another status, department or clear the filters." />
          )
        }
        exportName="tasks"
        exportRow={(t) => ({
          Project: t.project ?? '',
          Department: t.department ?? '',
          Topic: t.topic,
          Status: t.status,
          Responsible: t.responsible_person ?? assigneeName(t) ?? '',
          'Target Date': t.target_date ?? '',
          'Visible to managers': t.visible_to_gm ? 'Yes' : 'No',
          Notes: t.status_notes ?? '',
        })}
        footer={(rows) => (
          <div className="flex flex-wrap justify-between gap-2 text-muted">
            <span>{rows.length} tasks</span>
            <span>
              <strong className="text-danger">{rows.filter((t) => isOverdue(t, today)).length}</strong> overdue · <strong className="text-ink">{rows.filter((t) => t.status !== 'Complete').length}</strong> open
            </span>
          </div>
        )}
        renderCard={(t) => (
          <>
            <CardTitle
              title={t.topic}
              subtitle={[t.project, t.department].filter(Boolean).join(' · ') || undefined}
              right={isOverdue(t, today) ? <Badge tone="danger">Overdue</Badge> : <Badge tone={statusTone(t.status)}>{t.status}</Badge>}
            />
            <CardRow label="Responsible">{t.responsible_person ?? assigneeName(t) ?? '—'}</CardRow>
            <CardRow label="Target">{targetCell(t)}</CardRow>
            <CardRow label="Managers">{t.visible_to_gm ? 'Visible' : 'Hidden'}</CardRow>
            {t.status_notes && <p className="mt-2 text-sm text-ink-2">{t.status_notes}</p>}
            {canEdit && (
              <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                <span className="text-muted">Status</span>
                {statusControl(t)}
              </div>
            )}
          </>
        )}
      />

      <TaskModal task={editing} onClose={() => setEditing(null)} />
    </div>
  )
}
