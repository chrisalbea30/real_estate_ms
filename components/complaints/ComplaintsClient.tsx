'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, MessageSquareWarning, CircleDot, Loader, Siren, CheckCircle2 } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatCard, StatGrid } from '@/components/ui/StatCard'
import { DataTable, CardRow, CardTitle, type Column } from '@/components/ui/DataTable'
import { Badge, statusTone } from '@/components/ui/Badge'
import { Chips } from '@/components/ui/Tabs'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/Toast'
import { useConfirm } from '@/components/ui/Confirm'
import { useApp } from '@/components/app/AppProvider'
import { cn, formatDate, ymOf } from '@/lib/format'
import { severityTone, SEVERITY_RANK } from '@/lib/schemas/complaints'
import { deleteComplaintAction } from '@/app/(app)/app/complaints/actions'
import { ComplaintModal } from '@/components/complaints/ComplaintModal'
import { COMPLAINT_STATUSES, type Complaint, type ComplaintStatus } from '@/lib/types'

type StatusKey = 'all' | ComplaintStatus

export function ComplaintsClient({ complaints }: { complaints: Complaint[] }) {
  const router = useRouter()
  const toast = useToast()
  const confirm = useConfirm()
  const { can, today, rooms } = useApp()
  const [editing, setEditing] = useState<Partial<Complaint> | null>(null)
  const [status, setStatus] = useState<StatusKey>('all')
  const [criticalOnly, setCriticalOnly] = useState(false)

  const roomLabel = (c: Complaint) => {
    const r = rooms.find((x) => x.id === c.room_id) ?? (c.room != null ? rooms.find((x) => x.number === c.room) : undefined)
    return r ? r.name : c.room != null ? `Room ${c.room}` : ''
  }
  const isCritical = (c: Complaint) => c.severity === 'Critical' && c.status !== 'Closed'
  const resolvedThisMonth = (c: Complaint) => (c.status === 'Resolved' || c.status === 'Closed') && !!c.resolved_at && ymOf(c.resolved_at) === ymOf(today)

  const stats = useMemo(
    () => ({
      open: complaints.filter((c) => c.status === 'Open').length,
      inProgress: complaints.filter((c) => c.status === 'In Progress').length,
      critical: complaints.filter(isCritical).length,
      resolved: complaints.filter(resolvedThisMonth).length,
    }),
    [complaints, today], // eslint-disable-line react-hooks/exhaustive-deps
  )

  const base = useMemo(() => (criticalOnly ? complaints.filter(isCritical) : complaints), [complaints, criticalOnly])
  const counts = useMemo(() => {
    const c: Record<StatusKey, number> = { all: base.length, Open: 0, 'In Progress': 0, Resolved: 0, Closed: 0 }
    for (const x of base) c[x.status] = (c[x.status] ?? 0) + 1
    return c
  }, [base])
  const filtered = useMemo(() => (status === 'all' ? base : base.filter((c) => c.status === status)), [base, status])

  const remove = async (c: Complaint) => {
    const ok = await confirm({ title: `Delete complaint from ${c.guest_name}?`, message: 'The complaint and its resolution notes are removed permanently.', confirmLabel: 'Delete', danger: true })
    if (!ok) return
    const res = await deleteComplaintAction(c.id)
    if (!res.ok) return toast.error(res.error)
    toast.success('Complaint deleted')
    router.refresh()
  }

  const columns: Column<Complaint>[] = [
    { key: 'date', header: 'Date', cell: (c) => formatDate(c.date), sortValue: (c) => c.date, width: '8rem' },
    {
      key: 'guest',
      header: 'Guest',
      cell: (c) => (
        <div className="min-w-0">
          <div className="truncate font-medium">{c.guest_name}</div>
          <div className="truncate text-xs text-muted">{[roomLabel(c), c.category].filter(Boolean).join(' · ')}</div>
        </div>
      ),
      sortValue: (c) => c.guest_name,
    },
    { key: 'room', header: 'Room', cell: (c) => roomLabel(c) || <span className="text-muted">—</span>, sortValue: (c) => c.room ?? 0, hide: 'xl' },
    { key: 'category', header: 'Category', cell: (c) => c.category ?? <span className="text-muted">—</span>, sortValue: (c) => c.category ?? '', hide: 'xl' },
    { key: 'severity', header: 'Severity', cell: (c) => <Badge tone={severityTone(c.severity)}>{c.severity}</Badge>, sortValue: (c) => SEVERITY_RANK[c.severity] ?? 0, width: '7rem' },
    { key: 'status', header: 'Status', cell: (c) => <Badge tone={statusTone(c.status)}>{c.status}</Badge>, sortValue: (c) => c.status, width: '8rem' },
    { key: 'description', header: 'Description', cell: (c) => <span className="block max-w-sm truncate text-ink-2">{c.description}</span>, hide: 'lg' },
    { key: 'filed_by', header: 'Filed by', cell: (c) => c.filed_by ?? <span className="text-muted">—</span>, sortValue: (c) => c.filed_by ?? '', hide: 'xl' },
  ]

  const actions = (c: Complaint) => (
    <>
      {can('complaints', 'edit') && (
        <button className="icon-btn !h-8 !w-8" title="Edit" onClick={() => setEditing(c)}>
          <Pencil className="h-4 w-4" />
        </button>
      )}
      {can('complaints', 'delete') && (
        <button className="icon-btn !h-8 !w-8 text-danger" title="Delete" onClick={() => remove(c)}>
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </>
  )

  const pick = (s: StatusKey) => {
    setCriticalOnly(false)
    setStatus((v) => (v === s ? 'all' : s))
  }

  return (
    <div>
      <PageHeader
        title="Complaints"
        subtitle={`${complaints.length} complaint${complaints.length === 1 ? '' : 's'} · ${stats.open + stats.inProgress} unresolved`}
        actions={
          can('complaints', 'add') && (
            <button className="btn-primary" onClick={() => setEditing({})}>
              <Plus className="h-4 w-4" /> Log complaint
            </button>
          )
        }
      />

      <StatGrid className="mb-5">
        <StatCard label="Open" value={stats.open} icon={CircleDot} tone="warning" onClick={() => pick('Open')} active={status === 'Open' && !criticalOnly} />
        <StatCard label="In progress" value={stats.inProgress} icon={Loader} tone="info" onClick={() => pick('In Progress')} active={status === 'In Progress' && !criticalOnly} />
        <StatCard
          label="Critical"
          value={stats.critical}
          icon={Siren}
          tone={stats.critical > 0 ? 'danger' : 'default'}
          onClick={() => {
            setStatus('all')
            setCriticalOnly((v) => !v)
          }}
          active={criticalOnly}
        />
        <StatCard label="Resolved this month" value={stats.resolved} icon={CheckCircle2} tone="success" onClick={() => pick('Resolved')} active={status === 'Resolved' && !criticalOnly} />
      </StatGrid>

      <DataTable
        rows={filtered}
        columns={columns}
        rowKey={(c) => c.id}
        search={(c) => `${c.guest_name} ${c.room ?? ''} ${roomLabel(c)} ${c.category ?? ''} ${c.description} ${c.filed_by ?? ''}`}
        searchPlaceholder="Search guest, room, category, description…"
        defaultSort={{ key: 'date', dir: 'desc' }}
        toolbar={
          <>
            <Chips
              value={status}
              onChange={setStatus}
              options={[{ key: 'all', label: 'All', badge: counts.all }, ...COMPLAINT_STATUSES.map((s) => ({ key: s, label: s, badge: counts[s] }))]}
            />
            {criticalOnly && (
              <button type="button" onClick={() => setCriticalOnly(false)} className={cn('badge border border-danger bg-danger-soft px-3 py-1 text-danger transition hover:opacity-80')}>
                <Siren className="h-3.5 w-3.5" /> Critical only ×
              </button>
            )}
          </>
        }
        actions={actions}
        empty={
          complaints.length === 0 ? (
            <EmptyState icon={MessageSquareWarning} title="No complaints logged" description="Record guest complaints with a severity and follow them through to resolution." action={can('complaints', 'add') && <button className="btn-primary" onClick={() => setEditing({})}>Log first complaint</button>} />
          ) : (
            <EmptyState icon={MessageSquareWarning} title="No complaints match" description="Try another status or clear the filters." />
          )
        }
        exportName="complaints"
        exportRow={(c) => ({
          Date: c.date,
          Guest: c.guest_name,
          Room: roomLabel(c),
          Category: c.category ?? '',
          Severity: c.severity,
          Status: c.status,
          Description: c.description,
          Resolution: c.resolution_notes ?? '',
          'Resolved At': c.resolved_at ?? '',
          'Filed By': c.filed_by ?? '',
        })}
        footer={(list) => (
          <div className="flex flex-wrap justify-between gap-2 text-muted">
            <span>{list.length} complaints</span>
            <span>
              <strong className="text-danger">{list.filter(isCritical).length}</strong> critical · <strong className="text-ink">{list.filter((c) => c.status === 'Open' || c.status === 'In Progress').length}</strong> unresolved
            </span>
          </div>
        )}
        renderCard={(c) => (
          <>
            <CardTitle title={c.guest_name} subtitle={`${formatDate(c.date)}${roomLabel(c) ? ` · ${roomLabel(c)}` : ''}`} right={<Badge tone={severityTone(c.severity)}>{c.severity}</Badge>} />
            <p className="mb-2 line-clamp-3 text-sm text-ink-2">{c.description}</p>
            <CardRow label="Status">
              <Badge tone={statusTone(c.status)}>{c.status}</Badge>
            </CardRow>
            {c.category && <CardRow label="Category">{c.category}</CardRow>}
            {c.resolved_at && <CardRow label="Resolved">{formatDate(c.resolved_at)}</CardRow>}
            {c.filed_by && <CardRow label="Filed by">{c.filed_by}</CardRow>}
          </>
        )}
      />

      <ComplaintModal complaint={editing} onClose={() => setEditing(null)} />
    </div>
  )
}
